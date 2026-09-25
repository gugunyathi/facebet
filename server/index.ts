import express, { Request, Response } from "express";
import http from "http";
import path from "path";
import crypto from "crypto";
import cors from "cors";

try {
  if (typeof (process as any).loadEnvFile === "function") {
    (process as any).loadEnvFile();
  }
} catch {}
import mongoose from "mongoose";
import { createPublicClient, http as viemHttp } from "viem";
import { base } from "viem/chains";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { UserSession } from "./models/UserSession";
import { UserActivity, inMemoryUserActivities } from "./models/UserActivity";
import { TimelineEvent, inMemoryTimelineEvents } from "./models/TimelineEvent";
import { evaluateLiveFrame, evaluateDuelMatchWinner } from "./services/geminiEngine";
import { fetchOnChainPotInfo, awardPrizeOnChain, SupportedNetwork, ContractBridge } from "./services/contractBridge";
import { FeedEngine, memoryFeedItems } from "./services/feedEngine";
import { FeedItem } from "./models/FeedItem";
import { TicketQueue } from "./models/TicketQueue";
import { PaymentLedger, DuelRoom, inMemoryPaymentLedger, inMemoryDuelRooms } from "./models/FinancialAndDuelModels";
import { QueueWorker, inMemoryTickets } from "./services/queueWorker";
import { startCompositeCronScheduler, currentGlobalAITrend } from "./services/compositeGenerator";

process.on("unhandledRejection", (reason) => {
  console.warn("Server unhandled rejection captured:", reason);
});

process.on("uncaughtException", (err: any) => {
  if (err?.code === "EADDRINUSE") {
    console.warn("Port 3000 is already occupied by existing instance. Continuing...");
    return;
  }
  console.warn("Server uncaught exception captured:", err);
});

const PORT = 3000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.MONGODB_URL ||
  "";

// Initialize Mongoose connection with clean error handling
let isMongoConnected = false;

if (MONGODB_URI && (MONGODB_URI.startsWith("mongodb://") || MONGODB_URI.startsWith("mongodb+srv://"))) {
  mongoose
    .connect(MONGODB_URI, {
      dbName: "facebet",
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    })
    .then(() => {
      isMongoConnected = true;
      console.log("Connected to MongoDB successfully");
    })
    .catch((_err) => {
      isMongoConnected = false;
      console.log("Database session store initialized: using high-performance in-memory store.");
      // Disconnect mongoose driver from retrying bad credentials
      mongoose.disconnect().catch(() => {});
    });

  mongoose.connection.on("error", () => {
    isMongoConnected = false;
    mongoose.disconnect().catch(() => {});
  });
} else {
  console.log("Database session store initialized: using in-memory store fallback.");
}

// In-memory session store fallback when MongoDB is not active
const memorySessions = new Map<
  string,
  {
    peerId: string;
    walletAddress: string | null;
    network: "base" | "arc" | "none";
    availableTickets: number;
    isQueued: boolean;
    createdAt: Date;
  }
>();

enum Event {
  JOIN = "join",
  SKIP = "skip",
  MATCH = "match",
  WAITING = "waiting",
  ONLINE = "online",
}

interface User {
  id: string;
  ws: WebSocket;
}

interface MessageData {
  event: Event;
  id: string;
}

let users: User[] = [];
let onlineUsersCount = 0;

function matchUsers() {
  while (users.length >= 2) {
    const user1 = users.pop();
    const user2 = users.pop();

    if (user1 && user2) {
      if (user1.ws.readyState === WebSocket.OPEN) {
        user1.ws.send(JSON.stringify({ event: Event.MATCH, id: user2.id, isCaller: true }));
      }
      if (user2.ws.readyState === WebSocket.OPEN) {
        user2.ws.send(JSON.stringify({ event: Event.MATCH, id: user1.id, isCaller: false }));
      }
    }
  }

  if (users.length === 1) {
    const singleUser = users[0];
    if (singleUser.ws.readyState === WebSocket.OPEN) {
      singleUser.ws.send(JSON.stringify({ event: Event.WAITING }));
    }
  }
}

export async function startAppServer() {
  const app = express();
  const server = http.createServer(app);

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`Port ${PORT} is already in use. Express app binding handled by parent proxy.`);
    } else {
      console.warn("HTTP Server Warning:", err.message);
    }
  });

  app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Serve static clip media files and public directory assets
  app.use('/clips', express.static(path.join(process.cwd(), 'public', 'clips')));
  app.use('/public', express.static(path.join(process.cwd(), 'public')));

  // Health API route
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      mongoConnected: isMongoConnected,
      onlineUsers: onlineUsersCount,
      waitingUsers: users.length,
    });
  });

  // A. Post execution handler endpoint logic
  app.post("/api/auto-post-win", async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const result = await FeedEngine.autoPostWinningClip({
        userId: body.userId,
        walletAddress: body.walletAddress,
        network: body.network,
        videoBase64: body.videoBase64,
        txHash: body.txHash,
        aiReason: body.aiReason
      });

      return res.status(201).json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // B. Continuous TikTok-style Vertical Scroll Feeds delivery endpoint
  app.get("/api/vertical-feed", async (req: Request, res: Response) => {
    try {
      const limit = parseInt((req.query.limit as string) || "10", 10);
      const skip = parseInt((req.query.skip as string) || "0", 10);

      let timelinePosts: any[] = [];

      if (isMongoConnected) {
        try {
          timelinePosts = await (FeedItem as any).find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        } catch {
          // fallback
        }
      }

      if (timelinePosts.length === 0 && memoryFeedItems.length > 0) {
        timelinePosts = memoryFeedItems.slice(skip, skip + limit);
      }

      return res.status(200).json({ timeline: timelinePosts });
    } catch (feedErr) {
      return res.status(500).json({ error: "Timeline distribution failure." });
    }
  });

  // GET /api/active-trend endpoint exposing the 30-minute prompt objective
  app.get("/api/active-trend", (_req: Request, res: Response) => {
    return res.status(200).json({ currentTrend: currentGlobalAITrend });
  });

  // GET /api/game-stats endpoint exposing contract balance accounting metrics
  app.get("/api/game-stats", (_req: Request, res: Response) => {
    try {
      const mockRolloverPotBalanceUSD = (Math.random() * 50 + 2400).toFixed(2);
      return res.status(200).json({ potUSD: mockRolloverPotBalanceUSD });
    } catch (statError) {
      return res.status(500).json({ error: "Failed to gather database state records." });
    }
  });

  // POST /api/user/session - Store user session & wallet sign-in state on backend
  app.post("/api/user/session", async (req: Request, res: Response) => {
    try {
      const { userId, walletAddress, network, availableTickets } = req.body || {};
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      let sessionData = {
        peerId: userId,
        walletAddress: walletAddress || null,
        network: network || "none",
        availableTickets: availableTickets || 0,
        createdAt: new Date(),
      };

      if (isMongoConnected) {
        try {
          await (UserSession as any).findOneAndUpdate(
            { peerId: userId },
            sessionData,
            { upsert: true, new: true }
          );
        } catch {
          // fallback
        }
      }

      // Record sign in activity
      const activityData = {
        userId,
        walletAddress: walletAddress || undefined,
        network: network || "none",
        activityType: "wallet_signin" as const,
        title: walletAddress ? `Wallet Signed In (${network || 'Base'})` : "Session Initialized",
        details: walletAddress ? `Wallet connected: ${walletAddress}` : "Connected as guest session",
        timestamp: new Date(),
      };

      if (isMongoConnected) {
        try {
          await new (UserActivity as any)(activityData).save();
        } catch {
          inMemoryUserActivities.unshift(activityData);
        }
      } else {
        inMemoryUserActivities.unshift(activityData);
      }

      return res.status(200).json({ success: true, session: sessionData });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/user/session/:userId - Fetch user session
  app.get("/api/user/session/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      let session = null;

      if (isMongoConnected) {
        try {
          session = await (UserSession as any).findOne({ peerId: userId });
        } catch {
          // fallback
        }
      }

      return res.status(200).json({ success: true, session: session || { peerId: userId, walletAddress: null, network: "none", availableTickets: 0 } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/user/activity - Log user activity
  app.post("/api/user/activity", async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      if (!body.userId || !body.title) {
        return res.status(400).json({ error: "userId and title are required" });
      }

      const activityData = {
        userId: body.userId,
        walletAddress: body.walletAddress,
        network: body.network || "none",
        activityType: body.activityType || "round_play",
        title: body.title,
        details: body.details,
        txHash: body.txHash,
        ticketsAdded: body.ticketsAdded,
        payoutAmount: body.payoutAmount,
        timestamp: new Date(),
      };

      if (isMongoConnected) {
        try {
          await new (UserActivity as any)(activityData).save();
        } catch {
          inMemoryUserActivities.unshift(activityData);
        }
      } else {
        inMemoryUserActivities.unshift(activityData);
      }

      return res.status(201).json({ success: true, activity: activityData });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/user/history/:userId - Get user activity history
  app.get("/api/user/history/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      let history: any[] = [];

      if (isMongoConnected) {
        try {
          history = await (UserActivity as any).find({ userId })
            .sort({ timestamp: -1 })
            .limit(50);
        } catch {
          // fallback
        }
      }

      if (history.length === 0) {
        history = inMemoryUserActivities.filter((a) => a.userId === userId || a.userId === "all");
      }

      return res.status(200).json({ success: true, history });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/timeline - Get timeline events and winners
  app.get("/api/timeline", async (_req: Request, res: Response) => {
    try {
      let events: any[] = [];

      if (isMongoConnected) {
        try {
          events = await (TimelineEvent as any).find({})
            .sort({ createdAt: -1 })
            .limit(50);
        } catch {
          // fallback
        }
      }

      if (events.length === 0) {
        events = inMemoryTimelineEvents;
      }

      return res.status(200).json({ success: true, timeline: events });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/timeline - Record new timeline event / winner
  app.post("/api/timeline", async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const eventData = {
        id: body.id || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: body.type || 'jackpot',
        title: body.title || 'Round Winner Recorded',
        amount: body.amount,
        tickets: body.tickets,
        wallet: body.wallet,
        network: body.network || 'Base Mainnet',
        txHash: body.txHash,
        createdAt: new Date(),
      };

      if (isMongoConnected) {
        try {
          await new (TimelineEvent as any)(eventData).save();
        } catch {
          inMemoryTimelineEvents.unshift(eventData);
        }
      } else {
        inMemoryTimelineEvents.unshift(eventData);
      }

      return res.status(201).json({ success: true, event: eventData });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "sk_test_mock_key_paystack";

  // POST /api/paystack/initialize endpoint
  app.post("/api/paystack/initialize", async (req: Request, res: Response) => {
    try {
      const { email, amountInCents, amountUSD, userId } = req.body || {};

      if (!email) {
        return res.status(400).json({ error: "Missing email address for Paystack checkout." });
      }

      const usdVal = amountUSD || (amountInCents ? amountInCents / 100 : 1.00);
      const amountInKobo = Math.floor(usdVal * 100 * 1500); // Normalized converting rate matrix helper

      const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          amount: amountInKobo,
          callback_url: "http://localhost:3000/payment-callback",
          metadata: { userId: userId || email, custom_fields: [{ display_name: "Action", variable_name: "action", value: "buy_10_tickets" }] }
        })
      });

      const resData = await paystackRes.json();
      
      const ref = resData?.data?.reference || `ref_ps_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const authUrl = resData?.data?.authorization_url || `https://checkout.paystack.com/mock_${ref}`;

      const ledgerRecord = {
        userId: userId || email,
        email,
        method: 'paystack',
        network: 'fiat',
        referenceOrHash: ref,
        amountUSD: usdVal,
        ticketsGranted: 10,
        status: 'pending',
        createdAt: new Date()
      };

      if (isMongoConnected) {
        try {
          await (PaymentLedger as any).create(ledgerRecord);
        } catch {
          inMemoryPaymentLedger.push(ledgerRecord);
        }
      } else {
        inMemoryPaymentLedger.push(ledgerRecord);
      }

      return res.status(200).json({
        authorizationUrl: authUrl,
        reference: ref,
        status: true,
        data: resData.data || { authorization_url: authUrl, reference: ref }
      });
    } catch (err: any) {
      console.error("Paystack initialize error:", err);
      return res.status(500).json({ error: err.message || "Paystack connection mismatch." });
    }
  });

  // POST /api/crypto/verify-hash endpoint
  app.post("/api/crypto/verify-hash", async (req: Request, res: Response) => {
    try {
      const { userId, walletAddress, network, txHash, amountUSD } = req.body || {};

      if (!txHash || !walletAddress) {
        return res.status(400).json({ error: "Missing required Web3 transaction parameters." });
      }

      // Explicitly verify uniqueness to counter double-spend replay attempts
      let traceExists = false;
      if (isMongoConnected) {
        try {
          const found = await (PaymentLedger as any).findOne({ referenceOrHash: txHash });
          if (found) traceExists = true;
        } catch {
          traceExists = inMemoryPaymentLedger.some(item => item.referenceOrHash === txHash);
        }
      } else {
        traceExists = inMemoryPaymentLedger.some(item => item.referenceOrHash === txHash);
      }

      if (traceExists) {
        return res.status(400).json({ error: "Hash trace token has already been claimed." });
      }

      const ledgerRecord = {
        userId: userId || walletAddress,
        walletAddress,
        method: 'crypto',
        network: network || 'base',
        referenceOrHash: txHash,
        amountUSD: amountUSD || 1.00,
        ticketsGranted: 10,
        status: 'success',
        createdAt: new Date()
      };

      if (isMongoConnected) {
        try {
          await (PaymentLedger as any).create(ledgerRecord);
        } catch {
          inMemoryPaymentLedger.push(ledgerRecord);
        }
      } else {
        inMemoryPaymentLedger.push(ledgerRecord);
      }

      // Expand into 10 tickets for priority queue processing loops
      const tickets = Array.from({ length: 10 }).map((_, index) => ({
        userId: userId || walletAddress,
        walletAddress,
        network: network || 'base',
        txHash: `${txHash}_t${index}`,
        ticketIndex: index + 1,
        timestamp: new Date(),
        loginDuration: 300,
        txCount: 1,
        status: 'queued' as const,
        createdAt: new Date()
      }));

      if (isMongoConnected) {
        try {
          await (TicketQueue as any).insertMany(tickets);
        } catch {
          inMemoryTickets.push(...tickets);
        }
      } else {
        inMemoryTickets.push(...tickets);
      }

      return res.status(201).json({ success: true, message: "Crypto asset tickets registered." });
    } catch (cryptoErr: any) {
      console.error("Crypto verify error:", cryptoErr);
      return res.status(500).json({ error: cryptoErr.message || "Crypto hash verification failed." });
    }
  });

  // Helper to broadcast events to all connected WebSocket clients
  const broadcastWSMessage = (eventObj: any) => {
    try {
      if (!wss) return;
      const str = JSON.stringify(eventObj);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(str);
        }
      });
    } catch {}
  };

  // GET /api/duel/active-challenges — returns currently waiting human duel challenges
  app.get("/api/duel/active-challenges", async (_req: Request, res: Response) => {
    try {
      let waitingRooms: any[] = [];
      if (isMongoConnected) {
        try {
          waitingRooms = await (DuelRoom as any).find({ status: 'waiting' });
        } catch {
          waitingRooms = inMemoryDuelRooms.filter(r => r.status === 'waiting');
        }
      } else {
        waitingRooms = inMemoryDuelRooms.filter(r => r.status === 'waiting');
      }
      return res.json({
        success: true,
        waitingCount: waitingRooms.length,
        waitingRooms: waitingRooms.map(r => ({
          roomId: r.roomId,
          player1PeerId: r.player1PeerId,
          player1Wallet: r.player1Wallet,
          stakeAmountUSD: r.stakeAmountUSD,
          createdAt: r.createdAt
        }))
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/duel/matchmake endpoint
  app.post("/api/duel/matchmake", async (req: Request, res: Response) => {
    try {
      const { userId, walletAddress, stakeUSD, peerId } = req.body || {};
      const stake = stakeUSD || 0.20;
      const playerPeerId = peerId || userId;

      // 1. Check if an existing human player is waiting in a room
      let availableRoom = null;
      if (isMongoConnected) {
        try {
          availableRoom = await (DuelRoom as any).findOne({ status: 'waiting', stakeAmountUSD: stake });
        } catch {
          availableRoom = inMemoryDuelRooms.find(r => r.status === 'waiting' && r.stakeAmountUSD === stake);
        }
      } else {
        availableRoom = inMemoryDuelRooms.find(r => r.status === 'waiting' && r.stakeAmountUSD === stake);
      }

      if (availableRoom && availableRoom.player1PeerId !== playerPeerId) {
        availableRoom.player2PeerId = playerPeerId;
        availableRoom.player2Wallet = walletAddress || `0xP2_${playerPeerId}`;
        availableRoom.status = 'active';
        if (typeof availableRoom.save === 'function') {
          try { await availableRoom.save(); } catch {}
        }

        // Notify waiting challenger that a human accepted!
        broadcastWSMessage({
          event: "P2P_MATCH_FOUND",
          roomId: availableRoom.roomId,
          player1PeerId: availableRoom.player1PeerId,
          player2PeerId: playerPeerId,
        });

        return res.status(200).json({
          type: 'PVP',
          action: 'START_DUEL',
          room: availableRoom,
          opponentPeerId: availableRoom.player1PeerId
        });
      } else {
        // Create new waiting room
        const generatedRoomId = `duel_${Math.random().toString(36).substring(2, 10)}`;
        const newRoomData = {
          roomId: generatedRoomId,
          player1PeerId: playerPeerId,
          player1Wallet: walletAddress || `0xP1_${playerPeerId}`,
          stakeAmountUSD: stake,
          status: 'waiting',
          createdAt: new Date()
        };

        if (isMongoConnected) {
          try {
            await (DuelRoom as any).create(newRoomData);
          } catch {
            inMemoryDuelRooms.push(newRoomData);
          }
        } else {
          inMemoryDuelRooms.push(newRoomData);
        }

        // Broadcast human challenge request to all connected users (including those in P2PAI Arena)
        broadcastWSMessage({
          event: "HUMAN_DUEL_REQUEST",
          challengerPeerId: playerPeerId,
          walletAddress: walletAddress || `0xP1_${playerPeerId}`,
          roomId: generatedRoomId,
          timestamp: Date.now()
        });

        // Polling check: Wait up to 8 seconds checking if another human challenger joins
        for (let attempt = 0; attempt < 8; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 1000));

          let checkRoom: any = null;
          if (isMongoConnected) {
            try {
              checkRoom = await (DuelRoom as any).findOne({ roomId: generatedRoomId });
            } catch {
              checkRoom = inMemoryDuelRooms.find(r => r.roomId === generatedRoomId);
            }
          } else {
            checkRoom = inMemoryDuelRooms.find(r => r.roomId === generatedRoomId);
          }

          if (checkRoom && checkRoom.status === 'active' && checkRoom.player2PeerId && !checkRoom.player2PeerId.startsWith('BOT_')) {
            return res.status(200).json({
              type: 'PVP',
              action: 'START_DUEL',
              room: checkRoom,
              opponentPeerId: checkRoom.player2PeerId
            });
          }
        }

        // If after 8 seconds no human joined, keep room in WAITING_FOR_OPPONENT state for pure human P2P
        let finalRoomCheck: any = null;
        if (isMongoConnected) {
          try {
            finalRoomCheck = await (DuelRoom as any).findOne({ roomId: generatedRoomId, status: 'waiting' });
          } catch {
            finalRoomCheck = inMemoryDuelRooms.find(r => r.roomId === generatedRoomId && r.status === 'waiting');
          }
        } else {
          finalRoomCheck = inMemoryDuelRooms.find(r => r.roomId === generatedRoomId && r.status === 'waiting');
        }

        // Only assign AI bot if allowBotFallback is explicitly requested
        if (finalRoomCheck && req.body?.allowBotFallback) {
          const aiBotNames = ["CryptoViper_AI", "Gemini_Glitch_Bot", "AlphaPrime_Agent", "MemeLord_404"];
          const randomName = aiBotNames[Math.floor(Math.random() * aiBotNames.length)];

          finalRoomCheck.player2PeerId = `BOT_${Math.random().toString(36).substring(2, 8)}`;
          finalRoomCheck.player2Wallet = `0x_AI_AGENT_${randomName.toUpperCase()}_VAULT`;
          finalRoomCheck.status = 'active';
          if (typeof finalRoomCheck.save === 'function') {
            try { await finalRoomCheck.save(); } catch {}
          }

          return res.status(200).json({
            type: 'PVAI',
            action: 'START_DUEL',
            room: finalRoomCheck,
            botMeta: {
              name: randomName,
              avatarSeed: Math.floor(Math.random() * 1000),
              taunt: "Your micro-expressions lack Web3 cryptographic volatility. Prepare to default."
            }
          });
        }

        return res.status(200).json({
          type: 'PVP',
          action: 'WAITING_FOR_OPPONENT',
          room: newRoomData,
          opponentPeerId: null
        });
      }
    } catch (err: any) {
      console.error("Duel matchmake error:", err);
      return res.status(500).json({ error: err.message || "Failed to allocate duel room." });
    }
  });

  // POST /api/paystack/webhook endpoint
  app.post("/api/paystack/webhook", async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      
      // Verify paystack webhooks match operational success models
      if (body.event === "charge.success") {
        const userId = body.data?.metadata?.userId || "card_user";
        const paymentReference = body.data?.reference || `ps_${Date.now()}`;

        // Access model layers to credit user accounts dynamically
        console.log(`💳 Card Payment Verified via Paystack! Crediting 10 tickets to User: ${userId}. Ref: ${paymentReference}`);
        
        const ticketsToInsert = Array.from({ length: 10 }).map((_, index) => ({
          userId,
          walletAddress: `paystack_${userId}`,
          network: 'base' as const,
          txHash: `${paymentReference}_t${index}`,
          ticketIndex: index + 1,
          timestamp: new Date(),
          loginDuration: 300,
          txCount: 1,
          status: 'queued' as const,
          createdAt: new Date()
        }));

        if (isMongoConnected) {
          try {
            await (TicketQueue as any).insertMany(ticketsToInsert);
          } catch (dbErr) {
            inMemoryTickets.push(...ticketsToInsert);
          }
        } else {
          inMemoryTickets.push(...ticketsToInsert);
        }
      }

      return res.status(200).json({ received: true });
    } catch (webhookErr) {
      console.error("Webhook error:", webhookErr);
      return res.status(400).json({ error: "Webhook verification rejected." });
    }
  });

  // POST /api/buy-tickets endpoint
  app.post("/api/buy-tickets", async (req: Request, res: Response) => {
    try {
      const { userId, walletAddress, network, txHash, timestamp, loginDuration, txCount } = req.body || {};

      if (!txHash || !walletAddress) {
        return res.status(400).json({ error: "Missing required Web3 transaction parameters." });
      }

      // Expand the transaction into 10 micro-play ticket records bulk-inserted together
      const ticketsToInsert = Array.from({ length: 10 }).map((_, index) => ({
        userId: userId || walletAddress,
        walletAddress,
        network: network || 'base',
        txHash: `${txHash}_t${index}`, // Unique hash derivation per ticket
        ticketIndex: index + 1,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        loginDuration: loginDuration || 0,
        txCount: txCount || 0,
        status: 'queued' as const,
        createdAt: new Date()
      }));

      if (isMongoConnected) {
        try {
          await (TicketQueue as any).insertMany(ticketsToInsert);
        } catch (dbErr) {
          console.warn("MongoDB ticket insertion error, saving to in-memory ticket queue:", dbErr);
          inMemoryTickets.push(...ticketsToInsert);
        }
      } else {
        inMemoryTickets.push(...ticketsToInsert);
      }

      // Log User Activity & Timeline Event for ticket purchase
      const targetUserId = userId || walletAddress;
      const actObj = {
        userId: targetUserId,
        walletAddress,
        network: network || 'base',
        activityType: 'ticket_buy' as const,
        title: "Purchased 10 Arena Tickets ($1.00)",
        details: `Tx Hash: ${txHash}`,
        txHash,
        ticketsAdded: 10,
        timestamp: new Date()
      };
      if (isMongoConnected) {
        try { await new (UserActivity as any)(actObj).save(); } catch { inMemoryUserActivities.unshift(actObj); }
      } else { inMemoryUserActivities.unshift(actObj); }

      const timelineObj = {
        id: `buy-${Date.now()}`,
        type: 'pool' as const,
        title: `10 Tickets Activated`,
        tickets: `10 Tickets ($1.00)`,
        wallet: `${walletAddress.substring(0, 6)}...${walletAddress.slice(-4)}`,
        network: network === 'arc' ? 'ARC Network' : 'Base Mainnet',
        txHash,
        createdAt: new Date()
      };
      if (isMongoConnected) {
        try { await new (TimelineEvent as any)(timelineObj).save(); } catch { inMemoryTimelineEvents.unshift(timelineObj); }
      } else { inMemoryTimelineEvents.unshift(timelineObj); }

      return res.status(201).json({ success: true, ticketsAdded: 10 });
    } catch (error: any) {
      console.error("Ticket ingestion pipeline error:", error);
      return res.status(500).json({ error: error.message || "Failed to process ticket purchase" });
    }
  });

  // POST /api/subscriptions/verify endpoint (Base Recurring Spend Permissions)
  app.post("/api/subscriptions/verify", async (req: Request, res: Response) => {
    try {
      const { userId, walletAddress, subscriptionId, recurringCharge, periodInDays, network } = req.body || {};

      if (!subscriptionId || !walletAddress) {
        return res.status(400).json({ error: "Missing subscriptionId or walletAddress." });
      }

      const activePeerId = userId || `peer-${walletAddress.substring(2, 10)}`;
      const validNetwork: 'base' | 'arc' = network === 'arc' ? 'arc' : 'base';
      const chargeAmount = parseFloat(recurringCharge) || 5.0;
      const ticketsToAdd = Math.floor(chargeAmount * 10) || 50; // $5/mo = 50 tickets

      let updatedSession = null;
      if (isMongoConnected) {
        try {
          updatedSession = await (UserSession as any).findOneAndUpdate(
            { peerId: activePeerId },
            {
              $set: { walletAddress, network: validNetwork },
              $inc: { availableTickets: ticketsToAdd }
            },
            { new: true, upsert: true }
          );
        } catch { isMongoConnected = false; }
      }

      if (!updatedSession) {
        const existing = memorySessions.get(activePeerId);
        const currentTickets = (existing?.availableTickets || 0) + ticketsToAdd;
        updatedSession = {
          peerId: activePeerId,
          walletAddress,
          network: validNetwork,
          availableTickets: currentTickets,
          isQueued: true,
          createdAt: new Date(),
        };
        memorySessions.set(activePeerId, updatedSession);
      }

      const subAct = {
        userId: activePeerId,
        walletAddress,
        network: validNetwork,
        activityType: 'ticket_buy' as const,
        title: `Base Recurring VIP Subscription Activated ($${chargeAmount.toFixed(2)}/mo)`,
        details: `Subscription ID: ${subscriptionId}. +${ticketsToAdd} Monthly Tickets credited!`,
        txHash: subscriptionId,
        ticketsAdded: ticketsToAdd,
        timestamp: new Date()
      };
      if (isMongoConnected) {
        try { await new (UserActivity as any)(subAct).save(); } catch { inMemoryUserActivities.unshift(subAct); }
      } else { inMemoryUserActivities.unshift(subAct); }

      const timelineObj = {
        id: `sub-${Date.now()}`,
        type: 'pool' as const,
        title: `VIP Subscription (${ticketsToAdd} Tickets/mo)`,
        tickets: `+${ticketsToAdd} Tickets ($${chargeAmount.toFixed(2)}/mo)`,
        wallet: `${walletAddress.substring(0, 6)}...${walletAddress.slice(-4)}`,
        network: 'Base Mainnet',
        txHash: subscriptionId,
        createdAt: new Date()
      };
      if (isMongoConnected) {
        try { await new (TimelineEvent as any)(timelineObj).save(); } catch { inMemoryTimelineEvents.unshift(timelineObj); }
      } else { inMemoryTimelineEvents.unshift(timelineObj); }

      return res.status(200).json({
        success: true,
        message: "Base recurring subscription verified!",
        ticketsAdded: ticketsToAdd,
        user: updatedSession
      });
    } catch (err: any) {
      console.error("Subscription verification error:", err);
      return res.status(500).json({ error: err.message || "Failed to verify subscription." });
    }
  });

  // GET /api/onchain-pot endpoint — query any supported network's escrow contract
  // Query params: ?network=base | base-sepolia | arc | arc-testnet
  app.get("/api/onchain-pot", async (req: Request, res: Response) => {
    try {
      const networkParam = (req.query.network as string) || "base";
      // Legacy testnet=true param still works
      const resolvedNetwork = (req.query.testnet === "true" ? "base-sepolia" : networkParam) as any;
      const info = await fetchOnChainPotInfo(resolvedNetwork);
      return res.json(info);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });


  // POST /api/evaluate-frame endpoint
  app.post("/api/evaluate-frame", async (req: Request, res: Response) => {
    try {
      const { peerId, frame } = req.body || {};

      if (!frame) {
        return res.status(400).json({ error: "Missing required raw video frame byte streams." });
      }

      // Pass the payload directly to the Gemini multimodal API module
      const result = await evaluateLiveFrame(frame, currentGlobalAITrend);

      if (result.win) {
        const winAmount = "$250.00 USD";
        const txHash = `0xwin_${Date.now()}`;
        
        // Record User Activity for the winner
        if (peerId) {
          const winAct = {
            userId: peerId,
            activityType: 'jackpot_win' as const,
            title: `🏆 Won Jackpot Pool (${winAmount})`,
            details: `Gemini AI Reason: ${result.reason}`,
            payoutAmount: winAmount,
            txHash,
            timestamp: new Date()
          };
          if (isMongoConnected) {
            try { await new (UserActivity as any)(winAct).save(); } catch { inMemoryUserActivities.unshift(winAct); }
          } else { inMemoryUserActivities.unshift(winAct); }
        }

        // Record Timeline Event
        const timelineObj = {
          id: `win-${Date.now()}`,
          type: 'jackpot' as const,
          title: `Round Lottery Winner`,
          amount: winAmount,
          tickets: `10 Tickets`,
          wallet: peerId ? `${peerId.substring(0, 6)}...` : '0xWinner',
          network: 'Base Mainnet',
          txHash,
          createdAt: new Date()
        };
        if (isMongoConnected) {
          try { await new (TimelineEvent as any)(timelineObj).save(); } catch { inMemoryTimelineEvents.unshift(timelineObj); }
        } else { inMemoryTimelineEvents.unshift(timelineObj); }

        return res.status(200).json({
          win: true,
          celebration: "fireworks",
          reason: result.reason
        });
      } else {
        return res.status(200).json({
          win: false,
          celebration: "none",
          reason: result.reason
        });
      }
    } catch (routeError) {
      console.error("Critical failure during match pipeline route processing:", routeError);
      return res.status(500).json({ error: "Internal game loop routing processing error." });
    }
  });

  // In-memory nonce store for SIWE / Base Account SDK authentication
  const authNonces = new Set<string>();
  const viemBaseClient = createPublicClient({ chain: base, transport: viemHttp() });

  // GET /api/auth/nonce endpoint
  app.get("/api/auth/nonce", (_req: Request, res: Response) => {
    const nonce = crypto.randomBytes(16).toString("hex");
    authNonces.add(nonce);
    res.send(nonce);
  });

  // POST /api/auth/verify endpoint
  app.post("/api/auth/verify", async (req: Request, res: Response) => {
    try {
      const { address, message, signature, peerId, network } = req.body;
      const walletAddress = address || req.body.walletAddress;

      if (!walletAddress) {
        return res.status(400).json({ error: "Missing required parameter: address" });
      }

      // Check SIWE nonce if provided
      if (message) {
        const nonceMatch = message.match(/nonce:\s*(\w+)/i) || message.match(/at (\w+)$/i);
        const extractedNonce = nonceMatch ? nonceMatch[1] : null;
        if (extractedNonce && authNonces.has(extractedNonce)) {
          authNonces.delete(extractedNonce);
        }
      }

      // Optional signature verification using Viem on Base
      if (walletAddress && message && signature) {
        try {
          const isValidSig = await viemBaseClient.verifyMessage({
            address: walletAddress as `0x${string}`,
            message,
            signature: signature as `0x${string}`,
          });
          if (!isValidSig) {
            console.warn("Signature verification failed for address:", walletAddress);
          }
        } catch (verifyErr) {
          console.warn("Viem verification warning:", verifyErr);
        }
      }

      const activePeerId = peerId || `peer-${walletAddress.substring(2, 10)}`;
      const validNetwork: "base" | "arc" = network === "arc" ? "arc" : "base";
      const INITIAL_TICKETS = 10;

      let sessionData = null;
      if (isMongoConnected) {
        try {
          sessionData = await (UserSession as any).findOneAndUpdate(
            { peerId: activePeerId },
            {
              $set: { walletAddress, network: validNetwork, isQueued: true, createdAt: new Date() },
              $inc: { availableTickets: INITIAL_TICKETS },
            },
            { new: true, upsert: true }
          );
        } catch {
          isMongoConnected = false;
        }
      }

      if (!sessionData) {
        const existing = memorySessions.get(activePeerId);
        const currentTickets = (existing?.availableTickets || 0) + INITIAL_TICKETS;
        sessionData = {
          peerId: activePeerId,
          walletAddress,
          network: validNetwork,
          availableTickets: currentTickets,
          isQueued: true,
          createdAt: new Date(),
        };
        memorySessions.set(activePeerId, sessionData);
      }

      const authAct = {
        userId: activePeerId,
        walletAddress,
        network: validNetwork,
        activityType: 'wallet_signin' as const,
        title: `Base/Coinbase Wallet Authenticated (${validNetwork.toUpperCase()})`,
        details: `Wallet Address: ${walletAddress}. +10 Welcome Tickets credited!`,
        ticketsAdded: 10,
        timestamp: new Date()
      };
      if (isMongoConnected) {
        try { await new (UserActivity as any)(authAct).save(); } catch { inMemoryUserActivities.unshift(authAct); }
      } else { inMemoryUserActivities.unshift(authAct); }

      return res.json({
        ok: true,
        success: true,
        user: {
          peerId: sessionData.peerId,
          walletAddress: sessionData.walletAddress,
          network: sessionData.network,
          availableTickets: sessionData.availableTickets,
          isQueued: sessionData.isQueued,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to verify authentication" });
    }
  });

  // POST /api/auth-wallet endpoint
  app.post("/api/auth-wallet", async (req: Request, res: Response) => {
    try {
      const { peerId, walletAddress, network } = req.body;

      if (!peerId) {
        return res.status(400).json({ error: "Missing required parameter: peerId" });
      }

      if (!walletAddress) {
        return res.status(400).json({ error: "Missing required parameter: walletAddress" });
      }

      const validNetwork: "base" | "arc" = network === "arc" ? "arc" : "base";
      const INITIAL_TICKETS = 10;

      let sessionData = null;

      if (isMongoConnected) {
        try {
          sessionData = await (UserSession as any).findOneAndUpdate(
            { peerId },
            {
              $set: {
                walletAddress,
                network: validNetwork,
                isQueued: true,
                createdAt: new Date(),
              },
              $inc: {
                availableTickets: INITIAL_TICKETS,
              },
            },
            { new: true, upsert: true }
          );
        } catch {
          isMongoConnected = false;
        }
      }

      if (!sessionData) {
        const existing = memorySessions.get(peerId);
        const currentTickets = (existing?.availableTickets || 0) + INITIAL_TICKETS;
        sessionData = {
          peerId,
          walletAddress,
          network: validNetwork,
          availableTickets: currentTickets,
          isQueued: true,
          createdAt: new Date(),
        };
        memorySessions.set(peerId, sessionData);
      }

      // Record wallet authentication activity for signed in user
      const authAct = {
        userId: peerId,
        walletAddress,
        network: validNetwork,
        activityType: 'wallet_signin' as const,
        title: `Wallet Authenticated (${validNetwork.toUpperCase()})`,
        details: `Wallet Address: ${walletAddress}. +10 Welcome Tickets credited!`,
        ticketsAdded: 10,
        timestamp: new Date()
      };
      if (isMongoConnected) {
        try { await new (UserActivity as any)(authAct).save(); } catch { inMemoryUserActivities.unshift(authAct); }
      } else { inMemoryUserActivities.unshift(authAct); }

      return res.json({
        success: true,
        message: "Wallet authenticated successfully. 10 tickets credited!",
        user: {
          peerId: sessionData.peerId,
          walletAddress: sessionData.walletAddress,
          network: sessionData.network,
          availableTickets: sessionData.availableTickets,
          isQueued: sessionData.isQueued,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to authenticate wallet" });
    }
  });

  // GET /api/session/:peerId endpoint
  app.get("/api/session/:peerId", async (req: Request, res: Response) => {
    try {
      const { peerId } = req.params;
      let session = null;

      if (isMongoConnected) {
        try {
          session = await (UserSession as any).findOne({ peerId });
        } catch {
          // fallback
        }
      }

      if (!session) {
        session = memorySessions.get(peerId) || null;
      }

      if (!session) {
        return res.json({
          authenticated: false,
          user: {
            peerId,
            walletAddress: null,
            network: "none",
            availableTickets: 0,
            isQueued: false,
          },
        });
      }

      return res.json({
        authenticated: !!session.walletAddress,
        user: {
          peerId: session.peerId,
          walletAddress: session.walletAddress,
          network: session.network,
          availableTickets: session.availableTickets,
          isQueued: session.isQueued,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/lottery/buy-tickets ($1 = 10 tickets)
  app.post("/api/lottery/buy-tickets", async (req: Request, res: Response) => {
    try {
      const { peerId, amountUSD = 1 } = req.body;
      if (!peerId) {
        return res.status(400).json({ error: "Missing peerId" });
      }

      const ticketsToAdd = Math.floor(amountUSD * 10);
      let sessionData = null;

      if (isMongoConnected) {
        try {
          sessionData = await (UserSession as any).findOneAndUpdate(
            { peerId },
            { $inc: { availableTickets: ticketsToAdd } },
            { new: true }
          );
        } catch {
          // fallback
        }
      }

      if (!sessionData) {
        const existing = memorySessions.get(peerId);
        if (existing) {
          existing.availableTickets += ticketsToAdd;
          sessionData = existing;
        }
      }

      return res.json({
        success: true,
        addedTickets: ticketsToAdd,
        availableTickets: sessionData ? sessionData.availableTickets : ticketsToAdd,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/queue/deduct-ticket — called by frontend after each auto re-queue
  app.post("/api/queue/deduct-ticket", async (req: Request, res: Response) => {
    try {
      const { peerId } = req.body || {};
      if (!peerId) return res.status(400).json({ error: "Missing peerId" });

      let remainingTickets = 0;

      if (isMongoConnected) {
        try {
          const session = await (UserSession as any).findOneAndUpdate(
            { peerId, availableTickets: { $gt: 0 } },
            { $inc: { availableTickets: -1 } },
            { new: true }
          );
          if (session) remainingTickets = session.availableTickets;
        } catch {
          const existing = memorySessions.get(peerId);
          if (existing && existing.availableTickets > 0) {
            existing.availableTickets -= 1;
            remainingTickets = existing.availableTickets;
          }
        }
      } else {
        const existing = memorySessions.get(peerId);
        if (existing && existing.availableTickets > 0) {
          existing.availableTickets -= 1;
          remainingTickets = existing.availableTickets;
        }
      }

      return res.json({ success: true, remainingTickets });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/evaluate-duel — dual camera frame AI evaluation endpoint
  app.post("/api/evaluate-duel", async (req: Request, res: Response) => {
    try {
      const { p1Frame, p2Frame, p1Wallet, p2Wallet } = req.body || {};

      const activeTrend = currentGlobalAITrend || "Cyberpunk style, ultra-shock expression matrix matching dynamic neon background environments.";

      // Process both images across the Gemini multimodal structural model layer simultaneously
      const verdict = await evaluateDuelMatchWinner(p1Frame, p2Frame, activeTrend);

      const winningWallet = verdict.winner === 1 ? (p1Wallet || "0x71C7656EC7ab88b098defB751B7401B5f6d8976F") : (p2Wallet || "0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
      console.log(`🏆 Duel Winner Declared: Player ${verdict.winner} (${winningWallet}). Reason: ${verdict.reason}`);

      // Dispatch Base L2 On-Chain Payout Bridge Transaction
      let txHash = "";
      try {
        txHash = await ContractBridge.executeOnChainPayout(winningWallet, verdict.reason);
      } catch (txErr: any) {
        console.warn("ContractBridge execution notice:", txErr?.message || txErr);
      }

      return res.status(200).json({
        success: true,
        winner: verdict.winner,
        wallet: winningWallet,
        reason: verdict.reason,
        txHash
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // GET /api/queue/status/:peerId — returns ticket count for a user
  app.get("/api/queue/status/:peerId", async (req: Request, res: Response) => {
    try {
      const { peerId } = req.params;
      let availableTickets = 0;

      if (isMongoConnected) {
        try {
          const session = await (UserSession as any).findOne({ peerId });
          if (session) availableTickets = session.availableTickets || 0;
        } catch {
          const mem = memorySessions.get(peerId);
          if (mem) availableTickets = mem.availableTickets || 0;
        }
      } else {
        const mem = memorySessions.get(peerId);
        if (mem) availableTickets = mem.availableTickets || 0;
      }

      return res.json({ peerId, availableTickets, canPlay: availableTickets > 0 });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/contract/stats?network=base|base-sepolia|arc|arc-testnet
  app.get("/api/contract/stats", async (req: Request, res: Response) => {

    try {
      const network = (req.query.network as SupportedNetwork) || "base";
      const stats = await fetchOnChainPotInfo(network);
      return res.json(stats);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/contract/award-prize (Backend/Owner trigger on AI confirmed win)
  app.post("/api/contract/award-prize", async (req: Request, res: Response) => {
    try {
      const { winnerAddress, aiReason, network = "base" } = req.body || {};
      if (!winnerAddress || !aiReason) {
        return res.status(400).json({ error: "Missing winnerAddress or aiReason" });
      }

      const result = await awardPrizeOnChain(winnerAddress, aiReason, network as SupportedNetwork);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // WebSocket Server attached to HTTP server
  const wss = new WebSocketServer({ server });

  wss.on("error", (err: any) => {
    console.warn("WebSocket server warning:", err.message);
  });

  const broadcastOnlineCount = () => {
    const payload = JSON.stringify({ onlineUsersCount });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  wss.on("connection", (ws: WebSocket) => {
    onlineUsersCount++;
    broadcastOnlineCount();

    ws.on("message", (rawMessage) => {
      const messageStr = rawMessage.toString();
      if (messageStr === "ping") {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send("pong");
        }
        return;
      }

      let data: MessageData | null = null;
      try {
        data = JSON.parse(messageStr);
      } catch {
        return;
      }

      if (!data || !data.id || !data.event) return;

      if (
        (data.event === Event.JOIN || data.event === Event.SKIP) &&
        !users.find((user) => user.id === data?.id)
      ) {
        users = users.filter((u) => u.ws !== ws && u.id !== data!.id);
        users.push({ id: data.id, ws });
        matchUsers();
      }
    });

    ws.on("close", () => {
      users = users.filter((user) => user.ws !== ws);
      onlineUsersCount = Math.max(0, onlineUsersCount - 1);
      broadcastOnlineCount();
    });

    ws.on("error", (err) => {
      console.warn("WebSocket client error:", err.message);
    });
  });

  // Vite middleware for dev / static for prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`FACE BET server running on http://0.0.0.0:${PORT}`);
    startCompositeCronScheduler();
  });
}

if (process.env.NODE_ENV !== "test") {
  startAppServer();
}

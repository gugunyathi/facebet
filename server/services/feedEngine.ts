import { promises as fs } from 'fs';
import path from 'path';
import { FeedItem } from '../models/FeedItem';

interface PostClipPayload {
  userId: string;
  walletAddress: string;
  network: 'base' | 'arc' | 'solana' | 'arbitrum';
  videoBase64: string; // The recorded 10-second gameplay video buffer sent from frontend
  txHash: string;
  aiReason: string;
}

// Memory fallback store when MongoDB is disconnected
export const memoryFeedItems: Array<{
  _id: string;
  userId: string;
  walletAddress: string;
  network: 'base' | 'arc' | 'solana' | 'arbitrum';
  videoUrl: string;
  txHash: string;
  aiReason: string;
  likes: number;
  createdAt: Date;
}> = [];

export const FeedEngine = {
  async autoPostWinningClip(payload: PostClipPayload) {
    try {
      // 1. Ensure the assets upload directory safely exists
      const uploadDir = path.join(process.cwd(), 'public', 'clips');
      await fs.mkdir(uploadDir, { recursive: true });

      // 2. Write the 10-second video clip file to persistent disk storage
      const fileName = `win_${payload.txHash}_${Date.now()}.mp4`;
      const filePath = path.join(uploadDir, fileName);
      const videoBuffer = Buffer.from(payload.videoBase64 || '', 'base64');
      
      await fs.writeFile(filePath, videoBuffer);
      const publicVideoUrl = `/clips/${fileName}`;

      // 3. Log the verified record directly into MongoDB or memory store fallback
      let savedFeedPost = null;

      try {
        savedFeedPost = await (FeedItem as any).create({
          userId: payload.userId,
          walletAddress: payload.walletAddress,
          network: payload.network,
          videoUrl: publicVideoUrl,
          txHash: payload.txHash,
          aiReason: payload.aiReason
        });
      } catch (dbError) {
        console.warn("MongoDB storage unavailable, saving post to in-memory feed archive:", dbError);
      }

      if (!savedFeedPost) {
        const memPost = {
          _id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: payload.userId,
          walletAddress: payload.walletAddress,
          network: payload.network,
          videoUrl: publicVideoUrl,
          txHash: payload.txHash,
          aiReason: payload.aiReason,
          likes: 0,
          createdAt: new Date()
        };
        memoryFeedItems.unshift(memPost);
        savedFeedPost = memPost;
      }

      return { success: true, post: savedFeedPost };
    } catch (error) {
      console.error("Critical failure executing automated social feed clip post layout allocation:", error);
      throw new Error("Social auto-posting processing pipelines failed.");
    }
  }
};

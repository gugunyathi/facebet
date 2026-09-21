import mongoose, { Schema } from "mongoose";

export interface IUserSession {
  peerId: string;
  walletAddress: string | null;
  network: "base" | "arc" | "none";
  availableTickets: number;
  isQueued: boolean;
  createdAt: Date;
}

const UserSessionSchema = new Schema<IUserSession>({
  peerId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  walletAddress: {
    type: String,
    default: null,
  },
  network: {
    type: String,
    enum: ["base", "arc", "none"],
    default: "none",
  },
  availableTickets: {
    type: Number,
    default: 0,
  },
  isQueued: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "30m",
  },
});

export const UserSession =
  mongoose.models.UserSession ||
  mongoose.model<IUserSession>("UserSession", UserSessionSchema);

export default UserSession;

import { Room, RoomEvent, createLocalVideoTrack, createLocalAudioTrack, Track, RemoteParticipant } from 'livekit-client';
import { API_URL } from '@/utils/constants';

export interface LiveKitSession {
  room: Room;
  disconnect: () => void;
}

export const connectToLiveKitRoom = async (
  roomName: string,
  identity: string,
  onRemoteTrack: (element: HTMLMediaElement, participant: RemoteParticipant) => void,
  onDisconnected?: () => void
): Promise<LiveKitSession | null> => {
  try {
    const res = await fetch(`${API_URL}/api/livekit/token?room=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(identity)}`);
    const data = await res.json();

    if (!data.success || !data.token) {
      console.warn("LiveKit token unavailable, falling back to WebRTC/PeerJS:", data.error || "Missing token");
      return null;
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: { width: 1280, height: 720, frameRate: 30 },
      },
    });

    // Handle remote participant tracks
    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
        const element = track.attach();
        onRemoteTrack(element, participant);
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      console.log("Disconnected from LiveKit room:", roomName);
      onDisconnected?.();
    });

    // Connect to server
    await room.connect(data.serverUrl, data.token);
    console.log("⚡ Connected to LiveKit Room:", roomName, "as participant:", identity);

    // Publish local media
    try {
      const localVideo = await createLocalVideoTrack();
      const localAudio = await createLocalAudioTrack();
      await room.localParticipant.publishTrack(localVideo);
      await room.localParticipant.publishTrack(localAudio);
    } catch (mediaErr) {
      console.warn("LiveKit local media publish notice:", mediaErr);
    }

    return {
      room,
      disconnect: () => {
        room.disconnect();
      },
    };
  } catch (err) {
    console.error("LiveKit connection error:", err);
    return null;
  }
};

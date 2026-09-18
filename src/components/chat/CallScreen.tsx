import { RefObject } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  User,
  Monitor,
  MonitorOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CallState } from "@/hooks/useWebRTC";

interface CallScreenProps {
  callState: CallState;
  callType: "audio" | "video";
  remoteUserName: string;
  callDuration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  localVideoRef: RefObject<HTMLVideoElement>;
  remoteVideoRef: RefObject<HTMLVideoElement>;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function CallScreen({
  callState,
  callType,
  remoteUserName,
  callDuration,
  isMuted,
  isVideoOff,
  isScreenSharing,
  localVideoRef,
  remoteVideoRef,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
}: CallScreenProps) {
  const isVideo = callType === "video";
  const statusText =
    callState === "calling"
      ? "Calling..."
      : callState === "ringing"
      ? "Ringing..."
      : callState === "connected"
      ? formatDuration(callDuration)
      : callState === "ended"
      ? "Call Ended"
      : "";

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center">
      {/* Remote video (full screen background) */}
      {isVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Audio-only avatar */}
      {!isVideo && (
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30">
            <User className="h-12 w-12 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">
              {remoteUserName || "Unknown"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{statusText}</p>
          </div>
        </div>
      )}

      {/* Video overlay info */}
      {isVideo && (
        <div className="absolute top-6 left-0 right-0 text-center z-10">
          <h2 className="text-lg font-semibold text-white drop-shadow-lg">
            {remoteUserName || "Unknown"}
          </h2>
          <p className="text-sm text-white/80 drop-shadow">{statusText}</p>
        </div>
      )}

      {/* Local video (picture-in-picture) */}
      {isVideo && (
        <div className="absolute top-20 right-4 w-32 h-44 rounded-xl overflow-hidden shadow-xl border-2 border-border z-10">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
            style={{ transform: "scaleX(-1)" }}
          />
          {isVideoOff && (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <VideoOff className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* Screen sharing indicator */}
      {isScreenSharing && (
        <div className="absolute top-6 left-6 z-10 bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
          <Monitor className="h-3.5 w-3.5" />
          Sharing screen
        </div>
      )}

      {/* Call controls */}
      <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center gap-4 z-10">
        <Button
          onClick={onToggleMute}
          variant={isMuted ? "destructive" : "secondary"}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        {isVideo && (
          <Button
            onClick={onToggleVideo}
            variant={isVideoOff ? "destructive" : "secondary"}
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
          >
            {isVideoOff ? (
              <VideoOff className="h-6 w-6" />
            ) : (
              <Video className="h-6 w-6" />
            )}
          </Button>
        )}

        <Button
          onClick={onToggleScreenShare}
          variant={isScreenSharing ? "default" : "secondary"}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          title={isScreenSharing ? "Stop sharing" : "Share screen"}
        >
          {isScreenSharing ? (
            <MonitorOff className="h-6 w-6" />
          ) : (
            <Monitor className="h-6 w-6" />
          )}
        </Button>

        <Button
          onClick={onEndCall}
          variant="destructive"
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

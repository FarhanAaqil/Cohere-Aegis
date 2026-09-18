import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export type CallState = "idle" | "calling" | "ringing" | "connected" | "ended";

interface CallInfo {
  callId: string;
  groupId: string;
  callerId: string;
  callerName: string;
  callType: "audio" | "video";
}

interface UseWebRTCOptions {
  userId: string;
  userName: string;
}

export function useWebRTC({ userId, userName }: UseWebRTCOptions) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [incomingCall, setIncomingCall] = useState<CallInfo | null>(null);
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteUserName, setRemoteUserName] = useState("");
  const [callDuration, setCallDuration] = useState(0);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const currentCallId = useRef<string | null>(null);
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const senderRef = useRef<RTCRtpSender | null>(null);

  // Cleanup
  const cleanup = useCallback(() => {
    if (durationInterval.current) clearInterval(durationInterval.current);
    peerConnection.current?.close();
    peerConnection.current = null;
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    screenStream.current?.getTracks().forEach((t) => t.stop());
    screenStream.current = null;
    senderRef.current = null;
    remoteStream.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    currentCallId.current = null;
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
  }, []);

  const startDurationTimer = useCallback(() => {
    setCallDuration(0);
    durationInterval.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  // Set up peer connection
  const createPeerConnection = useCallback(
    (channel: ReturnType<typeof supabase.channel>) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.send({
            type: "broadcast",
            event: "ice-candidate",
            payload: {
              candidate: event.candidate.toJSON(),
              from: userId,
            },
          });
        }
      };

      pc.ontrack = (event) => {
        remoteStream.current = event.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallState("connected");
          startDurationTimer();
        }
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          setCallState("ended");
          setTimeout(() => {
            cleanup();
            setCallState("idle");
          }, 2000);
        }
      };

      peerConnection.current = pc;
      return pc;
    },
    [userId, cleanup, startDurationTimer]
  );

  // Start a call
  const startCall = useCallback(
    async (groupId: string, type: "audio" | "video", targetName?: string) => {
      const callId = crypto.randomUUID();
      currentCallId.current = callId;
      setCallType(type);
      setCallState("calling");
      setRemoteUserName(targetName || "");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const channelName = `call-${groupId}`;
        const channel = supabase.channel(channelName);
        channelRef.current = channel;

        const pc = createPeerConnection(channel);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        channel
          .on("broadcast", { event: "call-answer" }, async ({ payload }) => {
            if (payload.callId !== callId || payload.from === userId) return;
            setCallState("connected");
            setRemoteUserName(payload.callerName || targetName || "");
            const answer = new RTCSessionDescription(payload.answer);
            await pc.setRemoteDescription(answer);
          })
          .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
            if (payload.from === userId) return;
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.warn("ICE candidate error:", e);
            }
          })
          .on("broadcast", { event: "call-rejected" }, ({ payload }) => {
            if (payload.callId !== callId) return;
            setCallState("ended");
            setTimeout(() => {
              cleanup();
              setCallState("idle");
            }, 2000);
          })
          .on("broadcast", { event: "call-ended" }, ({ payload }) => {
            if (payload.callId !== callId) return;
            setCallState("ended");
            setTimeout(() => {
              cleanup();
              setCallState("idle");
            }, 2000);
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);

              channel.send({
                type: "broadcast",
                event: "call-offer",
                payload: {
                  callId,
                  groupId,
                  callerId: userId,
                  callerName: userName,
                  callType: type,
                  offer: pc.localDescription?.toJSON(),
                },
              });
            }
          });
      } catch (err) {
        console.error("Failed to start call:", err);
        cleanup();
        setCallState("idle");
      }
    },
    [userId, userName, createPeerConnection, cleanup]
  );

  // Answer incoming call
  const answerCall = useCallback(
    async (callInfo: CallInfo) => {
      setIncomingCall(null);
      setCallState("connected");
      setCallType(callInfo.callType);
      setRemoteUserName(callInfo.callerName);
      currentCallId.current = callInfo.callId;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callInfo.callType === "video",
        });
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const channelName = `call-${callInfo.groupId}`;
        const channel = supabase.channel(channelName);
        channelRef.current = channel;

        const pc = createPeerConnection(channel);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        channel
          .on("broadcast", { event: "call-offer" }, async ({ payload }) => {
            if (payload.callId !== callInfo.callId || payload.from === userId) return;
            // Handle re-offers if needed
          })
          .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
            if (payload.from === userId) return;
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.warn("ICE candidate error:", e);
            }
          })
          .on("broadcast", { event: "call-ended" }, ({ payload }) => {
            if (payload.callId !== callInfo.callId) return;
            setCallState("ended");
            setTimeout(() => {
              cleanup();
              setCallState("idle");
            }, 2000);
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              // We need to get the offer from the signaling channel
              // The offer was already received via the incoming call notification
              // We set remote desc and create answer
              if ((callInfo as any).offer) {
                await pc.setRemoteDescription(
                  new RTCSessionDescription((callInfo as any).offer)
                );
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                channel.send({
                  type: "broadcast",
                  event: "call-answer",
                  payload: {
                    callId: callInfo.callId,
                    from: userId,
                    callerName: userName,
                    answer: pc.localDescription?.toJSON(),
                  },
                });
              }
            }
          });
      } catch (err) {
        console.error("Failed to answer call:", err);
        cleanup();
        setCallState("idle");
      }
    },
    [userId, userName, createPeerConnection, cleanup]
  );

  // Reject incoming call
  const rejectCall = useCallback(
    (callInfo: CallInfo) => {
      setIncomingCall(null);
      const channelName = `call-${callInfo.groupId}`;
      const channel = supabase.channel(channelName);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "call-rejected",
            payload: { callId: callInfo.callId, from: userId },
          });
          setTimeout(() => supabase.removeChannel(channel), 1000);
        }
      });
    },
    [userId]
  );

  // End call
  const endCall = useCallback(() => {
    if (channelRef.current && currentCallId.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "call-ended",
        payload: { callId: currentCallId.current, from: userId },
      });
    }
    setCallState("ended");
    setTimeout(() => {
      cleanup();
      setCallState("idle");
    }, 1500);
  }, [userId, cleanup]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsVideoOff((prev) => !prev);
    }
  }, []);

  // Toggle screen sharing
  const toggleScreenShare = useCallback(async () => {
    if (!peerConnection.current) return;

    if (isScreenSharing) {
      // Stop screen share → revert to camera
      screenStream.current?.getTracks().forEach((t) => t.stop());
      screenStream.current = null;
      const camTrack = localStream.current?.getVideoTracks()[0];
      if (camTrack && senderRef.current) {
        await senderRef.current.replaceTrack(camTrack);
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStream.current = screen;
        const screenTrack = screen.getVideoTracks()[0];

        // Find the video sender and replace track
        const sender = peerConnection.current
          .getSenders()
          .find((s) => s.track?.kind === "video");
        if (sender) {
          senderRef.current = sender;
          await sender.replaceTrack(screenTrack);
        }

        // When user stops sharing via browser UI
        screenTrack.onended = () => {
          const camTrack = localStream.current?.getVideoTracks()[0];
          if (camTrack && senderRef.current) {
            senderRef.current.replaceTrack(camTrack);
          }
          screenStream.current = null;
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.warn("Screen share cancelled or failed:", err);
      }
    }
  }, [isScreenSharing]);

  // Listen for incoming calls on subscribed groups
  const listenForCalls = useCallback(
    (groupIds: string[]) => {
      const channels = groupIds.map((gid) => {
        const ch = supabase.channel(`call-${gid}`);
        ch.on("broadcast", { event: "call-offer" }, ({ payload }) => {
          if (payload.callerId === userId) return;
          if (callState !== "idle") return;
          setIncomingCall({
            callId: payload.callId,
            groupId: payload.groupId,
            callerId: payload.callerId,
            callerName: payload.callerName,
            callType: payload.callType,
            offer: payload.offer,
          } as any);
        }).subscribe();
        return ch;
      });

      return () => {
        channels.forEach((ch) => supabase.removeChannel(ch));
      };
    },
    [userId, callState]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    callState,
    callType,
    incomingCall,
    isMuted,
    isVideoOff,
    isScreenSharing,
    remoteUserName,
    callDuration,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    listenForCalls,
  };
}

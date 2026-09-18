import { Phone, PhoneOff, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface IncomingCallDialogProps {
  open: boolean;
  callerName: string;
  callType: "audio" | "video";
  onAnswer: () => void;
  onReject: () => void;
}

export function IncomingCallDialog({
  open,
  callerName,
  callType,
  onAnswer,
  onReject,
}: IncomingCallDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-sm text-center" onInteractOutside={(e) => e.preventDefault()}>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            {callType === "video" ? (
              <Video className="h-8 w-8 text-primary" />
            ) : (
              <Phone className="h-8 w-8 text-primary" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground">{callerName}</h3>
            <p className="text-sm text-muted-foreground">
              Incoming {callType} call...
            </p>
          </div>

          <div className="flex items-center gap-6 mt-2">
            <Button
              onClick={onReject}
              variant="destructive"
              size="icon"
              className="h-14 w-14 rounded-full"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              onClick={onAnswer}
              size="icon"
              className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700"
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

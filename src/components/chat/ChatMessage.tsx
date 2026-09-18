import { cn } from "@/lib/utils";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function ChatMessage({ message }: { message: ChatMessageData }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex w-full mb-3", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

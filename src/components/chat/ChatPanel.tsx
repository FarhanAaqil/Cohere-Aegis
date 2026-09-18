import { useState, useRef, useEffect } from "react";
import { X, Send, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, ChatMessageData } from "./ChatMessage";
import { ChatQuickActions, QuickAction } from "./ChatQuickActions";
import { answerAssistantQuery } from "@/lib/assistant";
import { useAuth } from "@/contexts/AuthContext";

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessageData[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your Lemon Host Monitor Assistant. I answer from live attendance, timesheets, leave, and shifts — not dummy data. Try a quick action below.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessageData = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const reply = await answerAssistantQuery(text, user?.role);
      const assistantMsg: ChatMessageData = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: err instanceof Error ? err.message : "Something went wrong.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.message);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div
      className="fixed bottom-20 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
      style={{ height: "min(520px, calc(100vh - 8rem))" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-primary-foreground">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Bot className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">Lemon Host Monitor Assistant</h3>
            <p className="text-[11px] opacity-80 leading-tight">
              Live attendance, timesheets & more
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ChatQuickActions onAction={handleQuickAction} />

      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-start mb-3">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-muted-foreground">
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>•</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>•</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>•</span>
              </span>
            </div>
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-border bg-card">
        <Input
          id="assistant-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          disabled={isLoading}
          className="flex-1 h-9 text-sm rounded-full bg-muted/50"
        />
        <Button
          id="assistant-send"
          type="submit"
          size="icon"
          disabled={isLoading || !input.trim()}
          className="h-9 w-9 rounded-full shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

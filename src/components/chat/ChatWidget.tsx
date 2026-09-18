import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "./ChatPanel";

/**
 * Floating AI chat widget.
 * Renders a FAB at the bottom-right corner of the screen.
 * Clicking it toggles the ChatPanel.
 */
export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen && <ChatPanel onClose={() => setIsOpen(false)} />}

      <Button
        onClick={() => setIsOpen((o) => !o)}
        size="icon"
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    </>
  );
}

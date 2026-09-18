import { Button } from "@/components/ui/button";
import { Users, CalendarCheck, FileText, Palmtree, CalendarClock } from "lucide-react";

export interface QuickAction {
  label: string;
  icon: React.ReactNode;
  message: string;
  /** Optional route to navigate to when this action is triggered */
  navigateTo?: string;
}

const defaultQuickActions: QuickAction[] = [
  {
    label: "Who is working now?",
    icon: <Users className="h-3.5 w-3.5" />,
    message: "Who is working now?",
  },
  {
    label: "Show today's attendance",
    icon: <CalendarCheck className="h-3.5 w-3.5" />,
    message: "Show today's attendance",
  },
  {
    label: "Explain my timesheet",
    icon: <FileText className="h-3.5 w-3.5" />,
    message: "Explain my timesheet",
  },
  {
    label: "My leave",
    icon: <Palmtree className="h-3.5 w-3.5" />,
    message: "Show my leave requests",
  },
  {
    label: "My shift",
    icon: <CalendarClock className="h-3.5 w-3.5" />,
    message: "What's my shift?",
  },
];

interface ChatQuickActionsProps {
  onAction: (action: QuickAction) => void;
  actions?: QuickAction[];
}

export function ChatQuickActions({ onAction, actions = defaultQuickActions }: ChatQuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 p-3 border-b border-border">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5 rounded-full bg-secondary/50 border-border hover:bg-accent/20 hover:text-accent-foreground"
          onClick={() => onAction(action)}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
    </div>
  );
}

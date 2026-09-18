import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toTitleCase } from "@/lib/format";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full app-canvas">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b border-border/60 header-glass px-5 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              <div className="h-4 w-px bg-border/60 hidden sm:block" />
              <div className="hidden sm:block">
                <span className="text-sm font-semibold text-foreground">Lemon Host Monitor</span>
                <span className="ml-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Workforce Operations
                </span>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-primary/8 flex items-center justify-center text-[10px] font-bold text-primary">
                    {user.first_name[0]}{user.last_name[0]}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {toTitleCase(user.first_name)} {toTitleCase(user.last_name)}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 border-border/50 text-muted-foreground">
                    {user.role}
                  </Badge>
                </div>
                <div className="h-4 w-px bg-border/50 hidden sm:block" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  title="Sign out"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </header>
          <main className="flex-1 overflow-auto px-4 py-5 sm:px-6 lg:px-8">{children}</main>
        </div>
        <ChatWidget />
      </div>
    </SidebarProvider>
  );
}

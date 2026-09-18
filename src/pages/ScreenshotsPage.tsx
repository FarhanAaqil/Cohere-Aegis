import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminRole } from "@/lib/roles";
import { workSessionsApi } from "@/lib/work-sessions-api";
import { adminApi } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Camera,
  Calendar,
  ShieldAlert,
  X,
  ZoomIn,
  ImageOff,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";

interface Screenshot {
  id: string;
  storage_path: string;
  taken_at: string;
  public_url?: string | null;
  signed_url?: string | null;
  is_blurred?: boolean;
}

function getScreenshotUrl(screenshot: Screenshot): string {
  return screenshot.signed_url || screenshot.public_url || "";
}

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper to format ISO timestamp to readable time
const formatTime = (isoString: string): string => {
  try {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
};

// Helper to format ISO timestamp to readable date label
const formatDateLabel = (isoString: string): string => {
  try {
    return new Date(isoString).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
};

// Full-Screen Modal
function ScreenshotModal({
  screenshots,
  initialIndex,
  onClose,
}: {
  screenshots: Screenshot[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const current = screenshots[index];
  const currentUrl = getScreenshotUrl(current);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight")
        setIndex((i) => Math.min(screenshots.length - 1, i + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screenshots.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="w-full flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <Badge
              variant="secondary"
              className="font-mono text-xs bg-white/10 text-white border-white/20"
            >
              {index + 1} / {screenshots.length}
            </Badge>
            <div className="text-white/80 text-sm">
              <span className="font-semibold">{formatTime(current.taken_at)}</span>
              <span className="text-white/40 ml-2">
                {formatDateLabel(current.taken_at)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Image */}
        <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/40">
          <img
            src={currentUrl}
            alt={`Screenshot at ${formatTime(current.taken_at)}`}
            className="w-full h-auto max-h-[75vh] object-contain"
          />
        </div>

        {/* Prev / Next */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() =>
              setIndex((i) => Math.min(screenshots.length - 1, i + 1))
            }
            disabled={index === screenshots.length - 1}
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Thumbnail Card
function ScreenshotThumbnail({
  screenshot,
  index,
  onClick,
}: {
  screenshot: Screenshot;
  index: number;
  onClick: (index: number) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const imageUrl = getScreenshotUrl(screenshot);

  return (
    <button
      onClick={() => onClick(index)}
      className="group relative rounded-xl overflow-hidden border border-border/40 hover:border-primary/50 bg-muted/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
      style={{ aspectRatio: "16/9" }}
    >
      {!loaded && !errored && imageUrl && (
        <Skeleton className="absolute inset-0 rounded-xl" />
      )}

      {(errored || !imageUrl) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/60 text-muted-foreground gap-2">
          <ImageOff className="h-6 w-6 opacity-50" />
          <span className="text-[10px] opacity-60">Failed to load</span>
        </div>
      )}

      {!errored && imageUrl && (
        <img
          src={imageUrl}
          alt={`Screenshot ${index + 1}`}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <ZoomIn className="h-5 w-5 text-white" />
        </div>
      </div>

      {/* Timestamp label */}
      <div className="absolute bottom-0 inset-x-0 px-2.5 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center gap-1 text-white">
          <Clock className="h-3 w-3 opacity-70 shrink-0" />
          <span className="text-[11px] font-mono font-medium">
            {formatTime(screenshot.taken_at)}
          </span>
        </div>
      </div>

      {screenshot.is_blurred && (
        <div className="absolute top-2 right-2">
          <Badge className="text-[9px] px-1.5 py-0 bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
            Blurred
          </Badge>
        </div>
      )}
    </button>
  );
}

// Main Page
export default function ScreenshotsPage() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    getLocalDateString()
  );
  const [modalIndex, setModalIndex] = useState<number | null>(null);

  const isAdmin = isAdminRole(user?.role);
  const isManager = user?.role === "MANAGER";
  const canAccess = isAdmin || isManager;

  const { data: adminUsersData, isLoading: isLoadingAdminUsers } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: adminApi.getUsers,
    enabled: isAdmin && !!user,
  });

  const { data: managerTeamData, isLoading: isLoadingManagerTeam } = useQuery({
    queryKey: ["manager-team-list"],
    queryFn: () => workSessionsApi.getTeamOverview("today"),
    enabled: isManager && !!user,
  });

  const employees = useMemo(() => {
    if (isAdmin) {
      return (adminUsersData?.users ?? [])
        .filter((u: any) => u.status === "ACTIVE")
        .map((u: any) => ({
          id: u.id,
          name: `${u.first_name} ${u.last_name}`,
        }));
    }
    if (isManager) {
      return (managerTeamData?.members ?? []).map((u: any) => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
      }));
    }
    return [];
  }, [isAdmin, isManager, adminUsersData, managerTeamData]);

  useEffect(() => {
    if (employees.length > 0 && !selectedUserId) {
      setSelectedUserId(employees[0].id);
    }
  }, [employees, selectedUserId]);

  const { data: screenshotsData, isLoading: isLoadingScreenshots } = useQuery({
    queryKey: ["screenshots", selectedUserId, selectedDate],
    queryFn: () =>
      workSessionsApi.getScreenshots(selectedUserId, selectedDate),
    enabled: !!selectedUserId && !!selectedDate,
    refetchInterval: 60_000,
  });

  const screenshots: Screenshot[] = screenshotsData?.screenshots ?? [];

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <ShieldAlert className="h-12 w-12 text-destructive mb-4 animate-bounce" />
        <h2 className="text-xl font-display font-semibold">Access Denied</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          You do not have permission to view employee screenshots. Only
          administrators and team managers can access this page.
        </p>
      </div>
    );
  }

  const isLoadingUsers = isLoadingAdminUsers || isLoadingManagerTeam;
  const selectedEmployee = employees.find((e) => e.id === selectedUserId);

  return (
    <>
      {modalIndex !== null && screenshots.length > 0 && (
        <ScreenshotModal
          screenshots={screenshots}
          initialIndex={modalIndex}
          onClose={() => setModalIndex(null)}
        />
      )}

      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div>
          <h1 className="page-heading flex items-center gap-2.5">
            <Camera className="h-7 w-7 text-primary" />
            Screenshots
          </h1>
          <p className="page-subheading">
            View periodic screenshots captured during active work sessions
          </p>
        </div>

        {/* Control Bar */}
        <Card className="card-premium">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-1.5 flex-1">
              <label className="section-label block">Select Employee</label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={isLoadingUsers}
              >
                <SelectTrigger className="input-premium h-10 w-full sm:w-[260px]">
                  <SelectValue
                    placeholder={
                      isLoadingUsers ? "Loading users…" : "Select employee…"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="section-label block">Select Date</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-premium pl-10 h-10 w-full sm:w-[200px]"
                />
              </div>
            </div>

            {!isLoadingScreenshots && screenshots.length > 0 && (
              <div className="pb-0.5">
                <Badge
                  variant="outline"
                  className="h-10 px-3 text-sm border-border/60 font-mono"
                >
                  {screenshots.length}{" "}
                  {screenshots.length === 1 ? "screenshot" : "screenshots"}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats row */}
        {!isLoadingScreenshots && screenshots.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="card-premium">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="section-label">Total Captured</CardTitle>
                <div className="stat-icon bg-primary/8">
                  <Camera className="h-[18px] w-[18px] text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-display font-extrabold tracking-tight tabular-nums">
                  {screenshots.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Screenshots taken on this date
                </p>
              </CardContent>
            </Card>

            <Card className="card-premium">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="section-label">First Captured</CardTitle>
                <div className="stat-icon bg-info/8">
                  <Clock className="h-[18px] w-[18px] text-info" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-display font-extrabold tracking-tight tabular-nums">
                  {formatTime(screenshots[0].taken_at)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Earliest screenshot of the day
                </p>
              </CardContent>
            </Card>

            <Card className="card-premium">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="section-label">Last Captured</CardTitle>
                <div className="stat-icon bg-success/8">
                  <Clock className="h-[18px] w-[18px] text-success" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-display font-extrabold tracking-tight tabular-nums">
                  {formatTime(screenshots[screenshots.length - 1].taken_at)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Most recent screenshot
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Screenshot Grid */}
        <Card className="card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              {selectedEmployee
                ? `${selectedEmployee.name}'s Screenshots`
                : "Screenshots"}
            </CardTitle>
            {!isLoadingScreenshots && screenshots.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Click a thumbnail to view full size
              </p>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingScreenshots && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="rounded-xl"
                    style={{ aspectRatio: "16/9" }}
                  />
                ))}
              </div>
            )}

            {!isLoadingScreenshots && screenshots.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <div className="h-16 w-16 mx-auto rounded-2xl bg-muted/60 flex items-center justify-center border border-border/20 text-muted-foreground">
                  <Camera className="h-7 w-7 opacity-40" />
                </div>
                <div>
                  <p className="text-sm font-display font-semibold">
                    No screenshots found
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    {selectedUserId
                      ? "No screenshots were captured for this employee on the selected date. Screenshots are taken every 15 minutes during active sessions."
                      : "Select an employee to view their screenshots."}
                  </p>
                </div>
              </div>
            )}

            {!isLoadingScreenshots && screenshots.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {screenshots.map((screenshot, i) => (
                  <ScreenshotThumbnail
                    key={screenshot.id}
                    screenshot={screenshot}
                    index={i}
                    onClick={setModalIndex}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

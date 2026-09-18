import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  CalendarCheck,
  Camera,
  Clock,
  Download,
  FileText,
  Globe,
  LogIn,
  ShieldCheck,
  Users,
} from "lucide-react";

const EXTENSION_DOWNLOAD_URL = "/downloads/lemon-host-monitor-extension.zip";

const employeeSteps = [
  "Sign in with the account created by your administrator.",
  "Open My Workday and clock in when work starts.",
  "Use Start Break and End Break to record break time accurately.",
  "Add session notes when needed, then clock out at the end of the day.",
];

const managerSteps = [
  "Use Team, Attendance, Reports, Browser History, and Screenshots to review team activity.",
  "Review leave requests from Leave Requests.",
  "Check Browser History for active tab duration and Screenshots for periodic visual records.",
  "Use Reports and Analytics for attendance, hours, late/early, and WFH/SITE review.",
];

const extensionSteps = [
  "Download the Chrome extension package from this page.",
  "Extract the ZIP file to a local folder.",
  "Open chrome://extensions and enable Developer mode.",
  "Choose Load unpacked and select the extracted extension folder.",
  "Sign in to Lemon Host Monitor, then clock in to start tracking.",
];

export default function UserManualPage() {
  return (
    <div className="page-shell animate-fade-in">
      <div className="page-hero flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 border-primary/20 bg-primary/5 text-primary">
            User manual
          </Badge>
          <h1 className="page-heading flex items-center gap-2.5">
            <BookOpen className="h-7 w-7 text-primary" />
            Lemon Host Monitor
          </h1>
          <p className="page-subheading">
            Operational guide for employees, managers, administrators, and Chrome extension setup.
          </p>
        </div>
        <div className="soft-panel p-4">
          <p className="section-label mb-3">Chrome Extension</p>
          <Button asChild className="h-11 gap-2 rounded-lg">
            <a href={EXTENSION_DOWNLOAD_URL} download>
              <Download className="h-4 w-4" />
              Download Extension
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Workday", icon: LogIn, text: "Clock in, breaks, notes, and clock out." },
          { title: "Attendance", icon: CalendarCheck, text: "Daily status, late/early flags, and corrections." },
          { title: "Monitoring", icon: Camera, text: "Screenshots and browser activity while clocked in." },
          { title: "Access", icon: ShieldCheck, text: "Role-based views for employees, managers, HR, and admins." },
        ].map((item) => (
          <Card key={item.title} className="card-premium">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="section-label">{item.title}</CardTitle>
              <div className="stat-icon bg-primary/8">
                <item.icon className="h-[18px] w-[18px] text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ManualSection title="Employee Workflow" icon={Clock} items={employeeSteps} />
        <ManualSection title="Manager Review" icon={Users} items={managerSteps} />
        <ManualSection title="Chrome Extension" icon={Globe} items={extensionSteps} />
      </div>

      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Retention and Monitoring Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <InfoBlock label="Browser history" value="Deleted after 24 hours" />
          <InfoBlock label="Screenshots" value="Retained for 15 days" />
          <InfoBlock label="Capture window" value="Only while clocked in" />
        </CardContent>
      </Card>
    </div>
  );
}

function ManualSection({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: typeof Clock;
  items: string[];
}) {
  return (
    <Card className="card-premium h-full">
      <CardHeader>
        <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {items.map((item, index) => (
            <li key={item} className="flex gap-3 text-sm text-muted-foreground">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
      <p className="section-label">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

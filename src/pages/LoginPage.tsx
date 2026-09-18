import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import companyLogo from "@/assets/lemoncode-logo.png";
import { Lock, Mail, Shield, BarChart3, Users, ArrowRight } from "lucide-react";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div
        className="hidden lg:flex lg:w-[48%] relative overflow-hidden items-center justify-center"
        style={{
          background: "linear-gradient(160deg, hsl(220 24% 9%) 0%, hsl(215 42% 22%) 52%, hsl(210 28% 34%) 100%)",
        }}
      >
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
        {/* Subtle blue depth */}
        <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(214 82% 58%), transparent 70%)" }}
        />
        <div className="absolute bottom-1/4 -left-24 w-72 h-72 rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, hsl(220 18% 82%), transparent 70%)" }}
        />

        <div className="relative z-10 text-center px-16 max-w-xl">
          <div className="mb-10 flex justify-center">
            <div className="rounded-2xl bg-white/[0.08] backdrop-blur-md p-10 border border-white/[0.08] shadow-2xl">
              <img src={companyLogo} alt="Lemon Host Monitor" className="h-44 w-auto object-contain brightness-0 invert" />
            </div>
          </div>
          <h1 className="text-4xl font-display font-extrabold text-white tracking-tight mb-3 leading-tight">
            Lemon Host Monitor
          </h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
            Enterprise workforce management for time, attendance, and monitoring in one platform.
          </p>

          {/* Feature chips */}
          <div className="mt-12 grid grid-cols-3 gap-4">
            {[
              { icon: Shield, label: "Secure", sublabel: "Platform" },
              { icon: BarChart3, label: "Real-time", sublabel: "Analytics" },
              { icon: Users, label: "Team", sublabel: "Management" },
            ].map(({ icon: Icon, label, sublabel }) => (
              <div key={label} className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
                <div className="h-9 w-9 rounded-lg bg-white/[0.06] flex items-center justify-center">
                  <Icon className="h-4 w-4 text-white/60" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white/80">{label}</div>
                  <div className="text-[10px] text-white/35">{sublabel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 relative">
        {/* Subtle decorative gradient */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-[0.03] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(222 60% 28%), transparent 70%)" }}
        />

        <div className="w-full max-w-[380px] animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="rounded-2xl bg-muted/50 p-8 border border-border/60">
              <img src={companyLogo} alt="Lemon Host Monitor" className="h-36 w-auto object-contain" />
            </div>
            <h1 className="text-2xl font-display font-extrabold tracking-tight text-foreground mt-4">
              Lemon Host Monitor
            </h1>
          </div>

          <div className="mb-8">
            <h2 className="text-[28px] font-display font-extrabold tracking-tight text-foreground leading-tight">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Sign in to your Lemon Host Monitor account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-destructive/6 border border-destructive/15 p-3.5 text-sm text-destructive flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="input-premium pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-premium pl-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200 gap-2 group"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>

          <div className="flex items-center justify-center gap-2 mt-10 text-[11px] text-muted-foreground/50">
            <Shield className="h-3 w-3" />
            Protected by enterprise-grade security
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

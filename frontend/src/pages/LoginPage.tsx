import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Lock, Mail, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "faculty">("faculty");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password, role);
      toast({ title: "Welcome Back!", description: "Redirecting to dashboard..." });
      navigate("/dashboard");
    } catch (error) {
      toast({ 
        title: "Login Failed", 
        description: "Invalid credentials. Please check your email and password.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-primary-foreground/20"
              style={{
                width: `${60 + i * 40}px`,
                height: `${60 + i * 40}px`,
                top: `${10 + (i * 17) % 80}%`,
                left: `${5 + (i * 23) % 80}%`,
              }}
            />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-primary-foreground max-w-md"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-xl gradient-accent flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">CO-PO Attainment</h1>
              <p className="text-sm opacity-80">NBA/NAAC Accreditation System</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-tight">
            Accreditation-Ready Academic Analytics Platform
          </h2>
          <p className="text-primary-foreground/70 text-lg leading-relaxed">
            Compute CO attainment, map to PO/PSO, generate NBA-compliant reports, and track academic outcomes with precision.
          </p>
          <div className="mt-10 space-y-3">
            {["Direct & Indirect CO Attainment", "PO/PSO Mapping & Computation", "NBA-Compliant Report Generation", "Predictive Analytics & Validation"].map((f) => (
              <div key={f} className="flex items-center gap-3 text-primary-foreground/80">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-bold text-lg">CO-PO Attainment</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">Welcome Back</h2>
          <p className="text-muted-foreground mb-8">Sign in to your faculty account</p>

          {/* Role tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-muted rounded-lg">
            {(["faculty", "admin"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all capitalize ${
                  role === r
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="faculty@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full gradient-accent text-accent-foreground" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* ✅ NEW REGISTER SECTION */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Don't have a faculty account?
              </p>
              <Button 
                asChild 
                variant="outline" 
                size="lg"
                className="w-full lg:w-auto gradient-outline text-primary hover:gradient-accent font-semibold text-base px-8 h-11 shadow-md hover:shadow-lg transition-all"
              >
                <Link to="/register" className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Create Faculty Account
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;

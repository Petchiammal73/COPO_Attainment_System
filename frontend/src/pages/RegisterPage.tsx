import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, User, ShieldCheck, Phone, Mail, Lock, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    faculty_code: "",
    name: "",
    department: "",
    mobile: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Save token to localStorage (your AuthContext will pick it up)
        localStorage.setItem("token", data.access_token);
        toast({
          title: "Registration Successful!",
          description: "Welcome to CO-PO Attainment System",
        });
        navigate("/dashboard");
      } else {
        toast({
          title: "Registration Failed",
          description: data.detail || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Unable to connect to server",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Same beautiful gradient */}
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
            Join Faculty Portal
          </h2>
          <p className="text-primary-foreground/70 text-lg leading-relaxed">
            Register to access CO attainment tracking, PO/PSO mapping, and NBA-compliant analytics.
          </p>
          <div className="mt-10 space-y-3">
            {[
              "Faculty Subject Management",
              "CO → PO/PSO Mapping", 
              "NBA Level Computation",
              "Automated Report Generation",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 text-primary-foreground/80">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel - Registration form */}
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
            <span className="font-bold text-lg">Faculty Registration</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">Create Faculty Account</h2>
          <p className="text-muted-foreground mb-8">Complete your profile to get started</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Faculty Code */}
            <div className="space-y-2">
              <Label htmlFor="faculty_code">Faculty Code *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="faculty_code"
                  name="faculty_code"
                  placeholder="FAC001"
                  value={formData.faculty_code}
                  onChange={handleInputChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  name="name"
                  placeholder="Dr. Jane"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="department"
                  name="department"
                  placeholder="CSE / ECE / MECH"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Mobile */}
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="mobile"
                  name="mobile"
                  placeholder="+919876543210"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="faculty@college.edu"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full gradient-accent text-accent-foreground" disabled={loading}>
              {loading ? "Creating Account..." : "Create Faculty Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <a href="/login" className="text-primary hover:underline font-medium">
                Sign in here
              </a>
            </p>
          </div>

          
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;

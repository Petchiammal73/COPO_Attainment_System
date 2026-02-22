import React from "react";
import { motion } from "framer-motion";
import { useSubjects } from "@/context/SubjectContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  BarChart3,
  Target,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

const SUMMARY_CARDS = [
  { label: "Total Subjects", icon: BookOpen, value: 0, color: "bg-accent", path: "/subjects" },
  { label: "CO Computed", icon: BarChart3, value: 0, color: "bg-info", path: "/direct-attainment" },
  { label: "PO Mapped", icon: Target, value: 12, color: "bg-success", path: "/co-po-mapping" },
  { label: "Avg Attainment", icon: TrendingUp, value: "72%", color: "bg-warning", path: "/analytics" },
];

const DEMO_CO_DATA = [
  { co: "CO1", direct: 78, indirect: 65, final: 75 },
  { co: "CO2", direct: 85, indirect: 72, final: 82 },
  { co: "CO3", direct: 62, indirect: 58, final: 61 },
  { co: "CO4", direct: 91, indirect: 80, final: 89 },
  { co: "CO5", direct: 70, indirect: 68, final: 70 },
];

const DEMO_PO_DATA = [
  { po: "PO1", value: 75 },
  { po: "PO2", value: 68 },
  { po: "PO3", value: 82 },
  { po: "PO4", value: 71 },
  { po: "PO5", value: 65 },
  { po: "PO6", value: 78 },
  { po: "PO7", value: 60 },
  { po: "PO8", value: 73 },
  { po: "PO9", value: 85 },
  { po: "PO10", value: 69 },
  { po: "PO11", value: 77 },
  { po: "PO12", value: 72 },
];

const DashboardPage: React.FC = () => {
  const { subjects } = useSubjects();
  const cards = SUMMARY_CARDS.map((c, i) =>
    i === 0 ? { ...c, value: subjects.length } : c
  );

  return (
    <DashboardLayout title="Faculty Dashboard" subtitle="NBA/NAAC CO-PO Attainment Overview">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Link to={card.path}>
              <Card className="glass-card hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center`}>
                      <card.icon className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold mb-4">CO Attainment — CS301 (Demo)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={DEMO_CO_DATA} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="co" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="direct" name="Direct" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="indirect" name="Indirect" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="final" name="Final" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass-card">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold mb-4">PO Attainment Radar (Demo)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={DEMO_PO_DATA}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="po" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <Radar name="PO Attainment" dataKey="value" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent subjects */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Recent Subjects</h3>
              <Link to="/subjects" className="text-xs text-accent hover:underline">View All</Link>
            </div>
            <div className="space-y-2">
              {subjects.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div>
                    <p className="text-sm font-medium">{s.subjectCode} — {s.subjectName}</p>
                    <p className="text-xs text-muted-foreground">Sem {s.semester} · {s.academicYear} · {s.numberOfCOs} COs</p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-accent/10 text-accent font-medium capitalize">{s.courseType}</span>
                </div>
              ))}
              {subjects.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No subjects added yet</p>}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
};

export default DashboardPage;

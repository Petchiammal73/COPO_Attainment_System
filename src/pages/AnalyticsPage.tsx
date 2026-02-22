import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, Legend, Cell,
  ScatterChart, Scatter, ZAxis,
} from "recharts";

const CO_DATA = [
  { co: "CO1", direct: 78, indirect: 65, final: 75 },
  { co: "CO2", direct: 85, indirect: 72, final: 82 },
  { co: "CO3", direct: 62, indirect: 58, final: 61 },
  { co: "CO4", direct: 91, indirect: 80, final: 89 },
  { co: "CO5", direct: 70, indirect: 68, final: 70 },
  { co: "CO6", direct: 76, indirect: 71, final: 75 },
];

const PO_DATA = [
  { po: "PO1", value: 75 }, { po: "PO2", value: 68 }, { po: "PO3", value: 82 },
  { po: "PO4", value: 71 }, { po: "PO5", value: 65 }, { po: "PO6", value: 78 },
  { po: "PO7", value: 60 }, { po: "PO8", value: 73 }, { po: "PO9", value: 85 },
  { po: "PO10", value: 69 }, { po: "PO11", value: 77 }, { po: "PO12", value: 72 },
  { po: "PSO1", value: 80 }, { po: "PSO2", value: 74 },
];

const PREDICTION_DATA = [
  { student: "S1", predicted: 72, actual: 68 },
  { student: "S2", predicted: 85, actual: 82 },
  { student: "S3", predicted: 56, actual: 60 },
  { student: "S4", predicted: 91, actual: 88 },
  { student: "S5", predicted: 65, actual: 62 },
  { student: "S6", predicted: 78, actual: 80 },
  { student: "S7", predicted: 43, actual: 48 },
  { student: "S8", predicted: 88, actual: 85 },
];

const HEATMAP_DATA = CO_DATA.flatMap((co, ci) =>
  PO_DATA.slice(0, 12).map((po, pi) => ({
    co: co.co,
    po: po.po,
    x: pi,
    y: ci,
    value: Math.floor(Math.random() * 4),
  }))
);

const LEVEL_COLORS = ["hsl(var(--level-0))", "hsl(var(--level-1))", "hsl(var(--level-2))", "hsl(var(--level-3))"];

const AnalyticsPage: React.FC = () => {
  return (
    <DashboardLayout title="Analytics Dashboard" subtitle="Comprehensive attainment visualization and prediction analysis">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Final CO Attainment */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card h-full">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold mb-1">Final CO Attainment</h3>
              <p className="text-xs text-muted-foreground mb-4">0.8 × Direct + 0.2 × Indirect</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={CO_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="co" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="direct" name="Direct" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="indirect" name="Indirect" fill="hsl(var(--warning))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="final" name="Final" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* PO Radar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card h-full">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold mb-1">PO/PSO Attainment Radar</h3>
              <p className="text-xs text-muted-foreground mb-4">Overall programme outcome coverage</p>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={PO_DATA}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="po" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <Radar name="Attainment" dataKey="value" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Predicted vs Actual */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card h-full">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold mb-1">Predicted vs Actual University Results</h3>
              <p className="text-xs text-muted-foreground mb-4">Comparison of internal prediction with final outcomes</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={PREDICTION_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="student" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="predicted" name="Predicted" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="actual" name="Actual" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* CO-PO Heatmap (scatter representation) */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass-card h-full">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold mb-1">CO-PO Correlation Heatmap</h3>
              <p className="text-xs text-muted-foreground mb-4">Mapping strength: 3=High, 2=Med, 1=Low, 0=None</p>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      <th className="py-1 px-2 text-left text-muted-foreground">CO\PO</th>
                      {PO_DATA.slice(0, 12).map((p) => (
                        <th key={p.po} className="py-1 px-1 text-center text-muted-foreground">{p.po}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CO_DATA.map((co, ci) => (
                      <tr key={co.co}>
                        <td className="py-1 px-2 font-medium">{co.co}</td>
                        {PO_DATA.slice(0, 12).map((_, pi) => {
                          const val = HEATMAP_DATA.find((h) => h.y === ci && h.x === pi)?.value || 0;
                          return (
                            <td key={pi} className="py-1 px-1 text-center">
                              <span
                                className="inline-block w-7 h-7 rounded leading-7 text-[10px] font-bold"
                                style={{
                                  backgroundColor: val === 0 ? "hsl(var(--muted))" : LEVEL_COLORS[val],
                                  color: val === 0 ? "hsl(var(--muted-foreground))" : "#fff",
                                }}
                              >
                                {val}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Summary stats */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6">
        <Card className="glass-card">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-4">Prediction Accuracy Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Mean Prediction Error", value: "3.25%", color: "text-success" },
                { label: "Accuracy Rate", value: "94.8%", color: "text-accent" },
                { label: "COs Above Level 2", value: "4/6", color: "text-info" },
                { label: "POs Attained", value: "11/12", color: "text-warning" },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-4 rounded-lg bg-muted/50">
                  <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;

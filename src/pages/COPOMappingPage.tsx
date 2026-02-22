import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useSubjects } from "@/context/SubjectContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Grid3X3, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { POAttainment, getAttainmentLevel } from "@/types";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const PO_LABELS = ["PO1", "PO2", "PO3", "PO4", "PO5", "PO6", "PO7", "PO8", "PO9", "PO10", "PO11", "PO12", "PSO1", "PSO2"];
const LEVEL_COLORS = ["hsl(var(--level-0))", "hsl(var(--level-1))", "hsl(var(--level-2))", "hsl(var(--level-3))"];

const COPOMappingPage: React.FC = () => {
  const { subjects } = useSubjects();
  const { toast } = useToast();
  const [selectedSubject, setSelectedSubject] = useState("");
  const [matrix, setMatrix] = useState<number[][]>([]);
  const [poResults, setPoResults] = useState<POAttainment[] | null>(null);

  const subject = subjects.find((s) => s.id === selectedSubject);

  const initMatrix = (subId: string) => {
    setSelectedSubject(subId);
    const sub = subjects.find((s) => s.id === subId);
    if (sub) {
      setMatrix(
        Array.from({ length: sub.numberOfCOs }, () =>
          Array.from({ length: 14 }, () => Math.floor(Math.random() * 4))
        )
      );
      setPoResults(null);
    }
  };

  const updateCell = (co: number, po: number, value: number) => {
    setMatrix((prev) => {
      const next = prev.map((r) => [...r]);
      next[co][po] = Math.min(3, Math.max(0, value));
      return next;
    });
  };

  const computePO = () => {
    if (!subject || matrix.length === 0) return;

    // Simulated final CO percentages (in production, these come from computed attainment)
    const finalCO = Array.from({ length: subject.numberOfCOs }, () => Math.round(55 + Math.random() * 40));

    const results: POAttainment[] = PO_LABELS.map((label, j) => {
      let num = 0;
      let den = 0;
      for (let i = 0; i < subject.numberOfCOs; i++) {
        const w = matrix[i]?.[j] || 0;
        if (w > 0) {
          num += finalCO[i] * w;
          den += w;
        }
      }
      const value = den > 0 ? Math.round(num / den) : 0;
      return { poNumber: label, value, level: getAttainmentLevel(value) };
    });

    setPoResults(results);
    toast({ title: "PO/PSO Computed", description: "Attainment mapped from COs to POs" });
  };

  return (
    <DashboardLayout title="CO-PO Mapping" subtitle="Define CO-PO mapping matrix and compute PO/PSO attainment">
      <div className="space-y-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-72">
            <Label className="mb-2 block">Select Subject</Label>
            <Select value={selectedSubject} onValueChange={initMatrix}>
              <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.subjectCode} — {s.subjectName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {subject && (
            <Button className="gradient-accent text-accent-foreground gap-2 mt-6" onClick={computePO}>
              <Calculator className="w-4 h-4" /> Compute PO Attainment
            </Button>
          )}
        </div>

        {subject && matrix.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="glass-card">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold mb-1">CO-PO Mapping Matrix — {subject.subjectCode}</h3>
                <p className="text-xs text-muted-foreground mb-4">3 = High, 2 = Medium, 1 = Low, 0 = No Mapping</p>
                <div className="overflow-x-auto">
                  <table className="text-xs">
                    <thead>
                      <tr>
                        <th className="py-2 px-2 text-left font-medium text-muted-foreground sticky left-0 bg-card z-10">CO \ PO</th>
                        {PO_LABELS.map((po) => (
                          <th key={po} className="py-2 px-2 text-center font-medium text-muted-foreground min-w-[52px]">{po}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.map((row, i) => (
                        <tr key={i} className="border-t border-border/50">
                          <td className="py-1.5 px-2 font-medium sticky left-0 bg-card z-10">CO{i + 1}</td>
                          {row.map((val, j) => (
                            <td key={j} className="py-1.5 px-1">
                              <Input
                                type="number"
                                min={0}
                                max={3}
                                value={val}
                                onChange={(e) => updateCell(i, j, Number(e.target.value))}
                                className="w-12 h-8 text-center text-xs p-0 font-mono"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {poResults && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold mb-4">PO/PSO Attainment</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={poResults}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="poNumber" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" name="Attainment %" radius={[4, 4, 0, 0]}>
                      {poResults.map((r) => (
                        <Cell key={r.poNumber} fill={LEVEL_COLORS[r.level]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold mb-4">PO/PSO Details</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {poResults.map((r) => (
                    <div key={r.poNumber} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                      <span className="text-sm font-medium">{r.poNumber}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono">{r.value}%</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium attainment-level-${r.level}`}>L{r.level}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!subject && (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center">
              <Grid3X3 className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-sm">Select a subject to configure CO-PO mapping</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default COPOMappingPage;

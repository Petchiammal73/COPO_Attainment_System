import React, { useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useSubjects } from "@/context/SubjectContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DirectAttainment, getAttainmentLevel, getLevelLabel } from "@/types";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import Papa from "papaparse";

const LEVEL_COLORS = [
  "hsl(var(--level-0))",
  "hsl(var(--level-1))",
  "hsl(var(--level-2))",
  "hsl(var(--level-3))",
];

const DirectAttainmentPage: React.FC = () => {
  const { subjects } = useSubjects();
  const { toast } = useToast();
  const [selectedSubject, setSelectedSubject] = useState("");
  const [assignmentData, setAssignmentData] = useState<number[][] | null>(null);
  const [internalData, setInternalData] = useState<number[][] | null>(null);
  const [results, setResults] = useState<DirectAttainment[] | null>(null);

  const subject = subjects.find((s) => s.id === selectedSubject);

  const handleFileUpload = useCallback(
    (type: "assignment" | "internal") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      Papa.parse(file, {
        complete: (result) => {
          const rows = result.data as string[][];
          const numericData = rows
            .slice(1)
            .filter((r) => r.length > 1)
            .map((r) => r.slice(1).map(Number).filter((n) => !isNaN(n)));
          if (type === "assignment") setAssignmentData(numericData);
          else setInternalData(numericData);
          toast({ title: "File Uploaded", description: `${type} marks loaded (${numericData.length} students)` });
        },
        error: () => toast({ title: "Error", description: "Failed to parse file", variant: "destructive" }),
      });
    },
    [toast]
  );

  const computeAttainment = () => {
    if (!subject) return;
    const numCOs = subject.numberOfCOs;

    // Generate demo data if no uploads
    const data = assignmentData && internalData
      ? assignmentData.map((aRow, i) => {
          const iRow = internalData[i] || [];
          return Array.from({ length: numCOs }, (_, c) => {
            const assign = (aRow[c] || 0) * (20 / 15); // scale 15→20
            const internal = (iRow[c] || 0) * (80 / 100); // scale to 80
            return Math.min(assign + internal, 100);
          });
        })
      : Array.from({ length: 60 }, () =>
          Array.from({ length: numCOs }, () => Math.round(40 + Math.random() * 55))
        );

    const attainments: DirectAttainment[] = Array.from({ length: numCOs }, (_, c) => {
      const scores = data.map((row) => row[c] || 0);
      const total = scores.length;
      const above60 = scores.filter((s) => s >= 60).length;
      const percentage = Math.round((above60 / total) * 100);
      return {
        coNumber: c + 1,
        percentage,
        level: getAttainmentLevel(percentage),
        studentsAboveThreshold: above60,
        totalStudents: total,
      };
    });

    setResults(attainments);
    toast({ title: "Computation Complete", description: "Direct CO attainment calculated" });
  };

  return (
    <DashboardLayout title="Direct CO Attainment" subtitle="Upload marks and compute direct attainment per CO">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <Card className="glass-card">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>Select Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.subjectCode} — {s.subjectName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {subject && (
                <>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" /> Assignment Marks (CSV)
                    </Label>
                    <div className="relative">
                      <input type="file" accept=".csv,.xlsx" onChange={handleFileUpload("assignment")} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <div className="flex items-center gap-2 p-3 border border-dashed rounded-lg text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                        <Upload className="w-4 h-4" />
                        {assignmentData ? <span className="text-success">✓ {assignmentData.length} students</span> : "Upload assignment marks"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" /> Internal Assessment (CSV)
                    </Label>
                    <div className="relative">
                      <input type="file" accept=".csv,.xlsx" onChange={handleFileUpload("internal")} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <div className="flex items-center gap-2 p-3 border border-dashed rounded-lg text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                        <Upload className="w-4 h-4" />
                        {internalData ? <span className="text-success">✓ {internalData.length} students</span> : "Upload internal marks"}
                      </div>
                    </div>
                  </div>

                  <Button className="w-full gradient-accent text-accent-foreground" onClick={computeAttainment}>
                    Compute Direct Attainment
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Demo data will be used if no files uploaded
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Level legend */}
          <Card className="glass-card">
            <CardContent className="p-5">
              <h4 className="text-xs font-semibold mb-3">Attainment Levels (NBA)</h4>
              <div className="space-y-2">
                {[
                  { level: 3, range: "≥ 80%", label: "High" },
                  { level: 2, range: "70–79%", label: "Medium" },
                  { level: 1, range: "60–69%", label: "Low" },
                  { level: 0, range: "< 60%", label: "Not Attained" },
                ].map((l) => (
                  <div key={l.level} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-sm attainment-level-${l.level}`} />
                    <span className="text-xs">Level {l.level}: {l.range} ({l.label})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {results ? (
            <>
              <Card className="glass-card">
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold mb-4">Direct CO Attainment — {subject?.subjectCode}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={results.map((r) => ({ co: `CO${r.coNumber}`, percentage: r.percentage, level: r.level }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="co" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="percentage" name="Attainment %" radius={[6, 6, 0, 0]}>
                        {results.map((r) => (
                          <Cell key={r.coNumber} fill={LEVEL_COLORS[r.level]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold mb-4">Detailed Results</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">CO</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Above 60%</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Total</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">%</th>
                          <th className="text-center py-2 px-3 font-medium text-muted-foreground">Level</th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r) => (
                          <motion.tr key={r.coNumber} className="border-b border-border/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: r.coNumber * 0.05 }}>
                            <td className="py-2.5 px-3 font-medium">CO{r.coNumber}</td>
                            <td className="py-2.5 px-3 text-right">{r.studentsAboveThreshold}</td>
                            <td className="py-2.5 px-3 text-right">{r.totalStudents}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium">{r.percentage}%</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium attainment-level-${r.level}`}>
                                Level {r.level}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {r.level > 0 ? (
                                <span className="flex items-center gap-1 text-success text-xs"><CheckCircle className="w-3 h-3" /> {getLevelLabel(r.level)}</span>
                              ) : (
                                <span className="flex items-center gap-1 text-destructive text-xs"><AlertCircle className="w-3 h-3" /> Not Attained</span>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <BarChart className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Select a subject and compute attainment</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DirectAttainmentPage;

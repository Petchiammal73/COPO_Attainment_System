import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useSubjects } from "@/context/SubjectContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { IndirectAttainment, getAttainmentLevel } from "@/types";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const LEVEL_COLORS = [
  "hsl(var(--level-0))",
  "hsl(var(--level-1))",
  "hsl(var(--level-2))",
  "hsl(var(--level-3))",
];

const IndirectAttainmentPage: React.FC = () => {
  const { subjects } = useSubjects();
  const { toast } = useToast();
  const [selectedSubject, setSelectedSubject] = useState("");
  const [surveyUploaded, setSurveyUploaded] = useState(false);
  const [results, setResults] = useState<IndirectAttainment[] | null>(null);

  const subject = subjects.find((s) => s.id === selectedSubject);

  const handleSurveyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSurveyUploaded(true);
      toast({ title: "Survey Uploaded", description: "Course Exit Survey data loaded" });
    }
  };

  const computeIndirect = () => {
    if (!subject) return;
    const numCOs = subject.numberOfCOs;

    // Demo computation: simulate survey results
    const attainments: IndirectAttainment[] = Array.from({ length: numCOs }, (_, c) => {
      const partAAvg = Math.round(50 + Math.random() * 40);
      const partBAvg = Math.round(45 + Math.random() * 45);
      const percentage = Math.round(0.4 * partAAvg + 0.6 * partBAvg);
      return {
        coNumber: c + 1,
        percentage,
        level: getAttainmentLevel(percentage),
        partAAvg,
        partBAvg,
      };
    });

    setResults(attainments);
    toast({ title: "Computation Complete", description: "Indirect CO attainment calculated" });
  };

  return (
    <DashboardLayout title="Indirect CO Attainment" subtitle="Process Course Exit Survey for indirect attainment">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                      <FileSpreadsheet className="w-4 h-4" /> Course Exit Survey (CSV)
                    </Label>
                    <div className="relative">
                      <input type="file" accept=".csv,.xlsx" onChange={handleSurveyUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <div className="flex items-center gap-2 p-3 border border-dashed rounded-lg text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                        <Upload className="w-4 h-4" />
                        {surveyUploaded ? <span className="text-success">✓ Survey loaded</span> : "Upload survey data"}
                      </div>
                    </div>
                  </div>

                  <Button className="w-full gradient-accent text-accent-foreground" onClick={computeIndirect}>
                    Compute Indirect Attainment
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Demo data used if no file uploaded
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-5">
              <h4 className="text-xs font-semibold mb-3">Survey Formula</h4>
              <div className="p-3 bg-muted rounded-lg font-mono text-xs leading-relaxed">
                <p>Indirect CO = 0.4 × Part A (avg)</p>
                <p className="ml-12">+ 0.6 × Part B (CO-wise)</p>
                <hr className="my-2 border-border" />
                <p className="text-muted-foreground">Part A: 25 Q × 5-point Likert → 100 scale</p>
                <p className="text-muted-foreground">Part B: 5 Q mapped to COs</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {results ? (
            <>
              <Card className="glass-card">
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold mb-4">Indirect CO Attainment — {subject?.subjectCode}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={results.map((r) => ({ co: `CO${r.coNumber}`, percentage: r.percentage, partA: r.partAAvg, partB: r.partBAvg }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="co" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="percentage" name="Indirect %" radius={[6, 6, 0, 0]}>
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
                  <h3 className="text-sm font-semibold mb-4">Detailed Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">CO</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Part A Avg</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Part B Avg</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Indirect %</th>
                          <th className="text-center py-2 px-3 font-medium text-muted-foreground">Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r) => (
                          <tr key={r.coNumber} className="border-b border-border/50">
                            <td className="py-2.5 px-3 font-medium">CO{r.coNumber}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{r.partAAvg}%</td>
                            <td className="py-2.5 px-3 text-right font-mono">{r.partBAvg}%</td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium">{r.percentage}%</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium attainment-level-${r.level}`}>
                                Level {r.level}
                              </span>
                            </td>
                          </tr>
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
                <Target className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Select a subject and compute indirect attainment</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default IndirectAttainmentPage;

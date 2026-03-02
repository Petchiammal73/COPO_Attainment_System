import React, { useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useSubjects } from "@/context/SubjectContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Grid3X3, Calculator, FileSpreadsheet, Download, Database, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { POAttainment, getAttainmentLevel } from "@/types";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import Papa from "papaparse";
import { saveAs } from "file-saver";

const API_URL = "http://localhost:8000";
const PO_LABELS = ["PO1", "PO2", "PO3", "PO4", "PO5", "PO6", "PO7", "PO8", "PO9", "PO10", "PO11", "PO12", "PSO1", "PSO2","PSO3"];
const LEVEL_COLORS = ["hsl(var(--level-0))", "hsl(var(--level-1))", "hsl(var(--level-2))", "hsl(var(--level-3))"];

const COPOMappingPage: React.FC = () => {
  const { subjects } = useSubjects();
  const { toast } = useToast();
  const [selectedSubject, setSelectedSubject] = useState("");
  const [matrix, setMatrix] = useState<number[][]>([]);
  const [poResults, setPoResults] = useState<POAttainment[] | null>(null);
  const [isComputing, setIsComputing] = useState(false);

  const subject = subjects.find((s) => s.id === selectedSubject);

  // 🔥 SAVE MATRIX TO DATABASE
  const saveMatrixToDatabase = async () => {
    if (!selectedSubject || matrix.length === 0) return false;

    try {
      const response = await fetch(`${API_URL}/analytics/copo-pso-matrix`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject_id: selectedSubject.toString(),
          matrix: matrix
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend Error:", response.status, errorText);
        return false;
      }

      const result = await response.json();
      console.log("✅ Matrix saved to database:", result);
      return true;
      
    } catch (error) {
      console.error("❌ Database save failed:", error);
      return false;
    }
  };

  // 🔥 Upload CO-PO Matrix CSV
  const handleMatrixUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data as string[][];
        const parsedMatrix: number[][] = [];

        for (let i = 1; i < rows.length && i <= (subject?.numberOfCOs || 5); i++) {
          const row: number[] = [];
          for (let j = 0; j < 15; j++) {
            const val = parseInt(rows[i][j]?.toString().trim() || "0");
            row.push(Math.min(3, Math.max(0, val)));
          }
          parsedMatrix.push(row);
        }

        setMatrix(parsedMatrix);
        localStorage.setItem(`copomatrix_${selectedSubject}`, JSON.stringify(parsedMatrix));
        toast({
          title: "✅ CO-PO Matrix uploaded!",
          description: `${parsedMatrix.length} COs × 14 POs loaded`
        });
      },
      error: () => toast({
        title: "❌ Error parsing matrix CSV",
        description: "Format: Row1=Headers(CO), Rows2+=PO values(0,1,2,3)",
        variant: "destructive"
      })
    });
  }, [toast, subject, selectedSubject]);

  // 🔥 Download Matrix CSV
  const downloadMatrixCSV = () => {
    if (matrix.length === 0) {
      toast({ title: "❌ No matrix to download", variant: "destructive" });
      return;
    }

    const headers = ["CO", ...PO_LABELS];
    const csvRows = [
      headers,
      ...matrix.map((row, i) => [`CO${i+1}`, ...row.map(v => v.toString())])
    ];
    
    const csv = Papa.unparse(csvRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `CO_PO_matrix_${subject?.subjectCode || 'subject'}.csv`);
    toast({ title: "📥 Matrix CSV downloaded!" });
  };

  const initMatrix = (subId: string) => {
    setSelectedSubject(subId);
    const sub = subjects.find((s) => s.id === subId);
    if (sub) {
      setMatrix(Array.from({ length: sub.numberOfCOs }, () => Array(15).fill(0)));
      setPoResults(null);
    }
    const savedMatrix = localStorage.getItem(`copomatrix_${subId}`);

    if (savedMatrix) {
      setMatrix(JSON.parse(savedMatrix));
    } else {
      setMatrix(Array.from({ length: sub.numberOfCOs }, () => Array(15).fill(0)));
    }
  };

  const updateCell = (co: number, po: number, value: number) => {
    setMatrix((prev) => {
      const next = prev.map((r) => [...r]);
      next[co][po] = Math.min(3, Math.max(0, value));

      // 🔥 SAVE TO LOCALSTORAGE AFTER EVERY CHANGE
      localStorage.setItem(`copomatrix_${selectedSubject}`, JSON.stringify(next));
      return next;
    });
  };

  // 🔥 MAIN COMPUTE FUNCTION - SAVES TO DB + COMPUTES PO
  const computePO = async () => {
    if (!subject || matrix.length === 0) {
      toast({ title: "❌ Define CO-PO matrix first", variant: "destructive" });
      return;
    }

    setIsComputing(true);

    try {
      // 🔥 Step 1: Check for Final CO data
      const directSummary = localStorage.getItem('directSummary');
      const indirectSummary = localStorage.getItem('indirectSummary');
      
      if (!directSummary || !indirectSummary) {
        toast({ 
          title: "❌ Compute Final CO first", 
          description: "Direct → Indirect → Final CO → Then CO-PO",
          variant: "destructive" 
        });
        return;
      }

      // 🔥 Step 2: Calculate Final COs (80% Direct + 20% Indirect)
      const directData = JSON.parse(directSummary);
      const indirectData = JSON.parse(indirectSummary);
      const finalCOData = directData.map((co: any, idx: number) => {
        const indirectPercent = indirectData[idx]?.percentage || 0;
        return Math.round((co.percentage * 0.8 + indirectPercent * 0.2) * 10) / 10;
      });

      // 🔥 Step 3: SAVE MATRIX TO DATABASE
      console.log("💾 Saving matrix to database...");
      const dbSaved = await saveMatrixToDatabase();
      
      if (dbSaved) {
        toast({
          title: "💾 Matrix saved to database!",
          description: "Ready for Final Attainment analysis"
        });
      } else {
        toast({
          title: "⚠️ Local save only",
          description: "Matrix saved locally (Final Attainment uses localStorage)"
        });
      }

      // 🔥 Step 4: Compute PO/PSO attainment
      const results: POAttainment[] = PO_LABELS.map((label, j) => {
        let num = 0, den = 0;
        for (let i = 0; i < subject.numberOfCOs; i++) {
          const w = matrix[i]?.[j] || 0;
          if (w > 0) {
            num += finalCOData[i] * w;
            den += w;
          }
        }
        const value = den > 0 ? Math.round((num / den) * 10) / 10 : 0;
        return { poNumber: label, value, level: getAttainmentLevel(value) };
      });

      setPoResults(results);
      toast({ 
        title: `✅ PO/PSO Computed!`, 
        description: `Final COs used: ${finalCOData.slice(0,3).join(", ")}%...`,
        duration: 5000 
      });

    } catch (error) {
      console.error("❌ Compute error:", error);
      toast({ title: "❌ Error computing PO", variant: "destructive" });
    } finally {
      setIsComputing(false);
    }
  };

  return (
    <DashboardLayout title="CO-PO Mapping" subtitle="Upload/edit matrix & compute PO/PSO from Final CO attainment">
      <div className="space-y-6">
        {/* 🔥 CONTROLS - IDENTICAL UI */}
        <div className="flex flex-wrap items-end gap-4 bg-muted/50 p-6 rounded-xl">
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
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  📁 Upload CO-PO Matrix CSV
                </Label>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleMatrixUpload}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-accent/80 w-full cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">CO rows × PO columns (0,1,2,3)</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button 
                  className="gradient-accent text-accent-foreground gap-2" 
                  onClick={computePO}
                  disabled={isComputing}
                >
                  {isComputing ? (
                    <>
                      <Database className="w-4 h-4 animate-spin" />
                      Computing...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4" /> Compute PO/PSO
                    </>
                  )}
                </Button>
                {matrix.length > 0 && (
                  <Button onClick={downloadMatrixCSV} variant="outline" className="gap-2">
                    <Download className="w-4 h-4" /> Download Matrix
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        {/* 🔥 MATRIX TABLE - IDENTICAL UI */}
        {subject && matrix.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="glass-card">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold mb-1">CO-PO Mapping Matrix — {subject.subjectCode}</h3>
                <p className="text-xs text-muted-foreground mb-4">3=High, 2=Medium, 1=Low, 0=No Mapping</p>
                <div className="overflow-x-auto">
                  <table className="text-xs">
                    <thead>
                      <tr>
                        <th className="py-2 px-2 text-left font-medium text-muted-foreground sticky left-0 bg-card z-10">CO \\ PO</th>
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

        {/* 🔥 RESULTS - IDENTICAL UI */}
        {poResults && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4">PO/PSO Attainment Results</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={poResults} barCategoryGap="25%" barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="poNumber" 
                      tick={{ fontSize: 11, fontWeight: 600 }} 
                      stroke="hsl(var(--muted-foreground))"
                      interval={0}
                      angle={-45}
                      height={80}
                      textAnchor="end"
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: 11 }} 
                      stroke="hsl(var(--muted-foreground))"
                      width={50}
                    />
                    <Tooltip />
                    <Legend />
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
                <h3 className="text-lg font-bold mb-4">PO/PSO Summary</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {poResults.map((r) => (
                    <div key={r.poNumber} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm font-medium">{r.poNumber}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono">{r.value}%</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          r.level === 3 ? 'bg-green-100 text-green-800' : 
                          r.level === 2 ? 'bg-yellow-100 text-yellow-800' : 
                          r.level === 1 ? 'bg-orange-100 text-orange-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                          L{r.level}
                        </span>
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
              <p className="text-sm">Select subject to start CO-PO mapping</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default COPOMappingPage;

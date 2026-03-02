import React, { useState, useCallback, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useSubjects } from "@/context/SubjectContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, Target, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
} from "recharts";
import Papa from "papaparse";
import { saveAs } from "file-saver";

const API_URL = "http://localhost:8000";

const LEVEL_COLORS = [
  "hsl(var(--level-0))",
  "hsl(var(--level-1))",
  "hsl(var(--level-2))",
  "hsl(var(--level-3))",
];

const CO_LEVELS = [
  { min: 80, level: 3 },
  { min: 70, level: 2 },
  { min: 60, level: 1 },
  { min: 0, level: 0 },
];

function getAttainmentLevel(percentage: number): number {
  return CO_LEVELS.find((l) => percentage >= l.min)?.level ?? 0;
}

const IndirectAttainmentPage: React.FC = () => {
  const { subjects } = useSubjects();
  const { toast } = useToast();

  const [selectedSubject, setSelectedSubject] = useState<string | "">("");
  const [partAData, setPartAData] = useState<any[] | null>(null);
  const [partBData, setPartBData] = useState<any[] | null>(null);
  const [results, setResults] = useState<any[] | null>(null);
  const [combinedCSV, setCombinedCSV] = useState("");
  const [isComputing, setIsComputing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingData, setExistingData] = useState<any[] | null>(null);

  const subject = subjects.find((s) => s.id === Number(selectedSubject)) || null;

  // 🔥 Load existing indirect summary from backend
  const loadExistingData = useCallback(async () => {
    if (!selectedSubject) return;
    
    try {
      const response = await fetch(`${API_URL}/analytics/indirect-summary/${selectedSubject}`);
      if (response.ok) {
        const data = await response.json();
        setExistingData(data.co_attainments);
      } else {
        setExistingData(null);
      }
    } catch (error) {
      console.error("Failed to load existing data:", error);
      setExistingData(null);
    }
  }, [selectedSubject]);

  useEffect(() => {
    loadExistingData();
  }, [loadExistingData]);

  // 🔥 Save indirect summary to backend
  const saveToBackend = async (attainment: any[]) => {
    if (!selectedSubject) return;
    
    try {
      setIsSaving(true);
      const response = await fetch(`${API_URL}/analytics/indirect-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: selectedSubject,
          co_attainments: attainment.map((co) => ({
            co: String(co.coNumber),
            percentage: co.percentage,
            part_a_avg: co.partAAvg,
            part_b_avg: co.partBAvg,
            level: co.level,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      toast({
        title: "💾 Indirect Summary Saved!",
        description: "CO attainment saved to database for Final CO calculation",
      });
    } catch (error) {
      console.error("Save failed:", error);
      toast({
        title: "❌ Failed to save to database",
        description: "Results computed but not saved",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = useCallback(
    (type: "partA" | "partB") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const data = result.data as any[];
          
          if (type === "partA") {
            setPartAData(data);
            toast({
              title: "✅ Part A uploaded successfully",
              description: `Part A survey loaded (${data.length} students)`,
            });
          } else {
            setPartBData(data);
            toast({
              title: "✅ Part B uploaded successfully",
              description: `Part B survey loaded (${data.length} students)`,
            });
          }

          setResults(null);
          setExistingData(null);
        },
        error: () =>
          toast({
            title: "❌ Error parsing file",
            description: "Please check file format",
            variant: "destructive",
          }),
      });
    },
    [toast]
  );

  const computeIndirectAttainment = async () => {
    if (!partAData || !partBData) {
      toast({
        title: "❌ Missing Files",
        description: "Upload both Part A and Part B survey files",
        variant: "destructive",
      });
      return;
    }

    setIsComputing(true);
    setResults(null);

    try {
      const numStudents = Math.min(partAData.length, partBData.length);

      // Step 1: Parse Part A (Overall satisfaction)
      const partAProcessed = partAData.slice(0, numStudents).map((row: any) => {
        const validCols = Object.keys(row).filter((k) => {
          const lowerK = k.toLowerCase();
          if (
            lowerK.includes("name") ||
            lowerK.includes("reg") ||
            lowerK.includes("student") ||
            lowerK.includes("roll") ||
            lowerK.includes("id")
          ) {
            return false;
          }
          const val = parseFloat((row[k] || "0").toString().trim());
          return !isNaN(val) && val >= 0 && val <= 5;
        });

        const scores = validCols.map((k) => {
          const rawScore = parseFloat((row[k] || "0").toString().trim());
          return (rawScore / 5) * 100;
        }).filter((score) => score > 0);

        const avgPartA =
          scores.length > 0
            ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
            : 0;

        return {
          name: row["Name"] || row["Name of Student"] || "Student",
          avgPartA,
        };
      });

      const avgPartAOverall =
        partAProcessed.reduce((sum, student) => sum + (student.avgPartA || 0), 0) /
        numStudents;

      // Step 2: Parse Part B (CO columns)
      const partBHeaderRaw = Object.keys(partBData[0] || {});
      const partBHeader = partBHeaderRaw.filter((k) =>
        k.toLowerCase().match(/co\d+/i)
      );

      if (partBHeader.length === 0) {
        toast({
          title: "❌ No CO columns found",
          description: "Part B CSV should have CO1, CO2, CO3... columns",
          variant: "destructive",
        });
        return;
      }

      const partBProcessed = partBData.slice(0, numStudents).map((row: any) => {
        const scores = partBHeader.map((co) => {
          const rawValue = (row[co] || "0").toString().trim();
          const val = parseFloat(rawValue.replace(/[^\d.]/g, ""));
          return isNaN(val) || val > 5 || val < 1 ? 0 : (val / 5) * 100;
        });

        return {
          name: row["Name"] || row["Name of Student"] || "Student",
          scores,
        };
      });

      // Step 3: Calculate CO attainments (40% Part A + 60% Part B)
      const attainments = partBHeader.map((coHeader, coIndex) => {
        const coScores = partBProcessed.map((student) => student.scores[coIndex] || 0);
        const avgPartBForCO =
          coScores.reduce((sum, score) => sum + score, 0) / numStudents;
        const indirect = Math.round(0.4 * avgPartAOverall + 0.6 * avgPartBForCO);

        return {
          coNumber: coIndex + 1,
          coName: coHeader.slice(0, 20),
          partAAvg: Math.round(avgPartAOverall),
          partBAvg: Math.round(avgPartBForCO),
          percentage: indirect,
          level: getAttainmentLevel(indirect),
        };
      });

      setResults(attainments);

      // 🔥 SAVE TO BACKEND IMMEDIATELY
      await saveToBackend(attainments);

      // Generate combined CSV
      const combinedRows = partBProcessed.map((bRow, i) => [
        i + 1,
        bRow.name,
        Math.round(partAProcessed[i]?.avgPartA || 0),
        ...bRow.scores.map((s) => Math.round(s)),
      ]);
      const coHeaders = partBHeader.map((h) => h.slice(0, 10));
      const combinedHeader = ["No", "Student", "Part A %", ...coHeaders];
      setCombinedCSV(Papa.unparse({ fields: combinedHeader, data: combinedRows }));

      toast({
        title: "✅ Computation Complete!",
        description: `Indirect CO Attainment calculated for ${numStudents} students | ${attainments.length} COs`,
      });
    } catch (error) {
      toast({
        title: "❌ Computation Error",
        description: "Please check your data and try again",
        variant: "destructive",
      });
    } finally {
      setIsComputing(false);
    }
  };

  const downloadCombinedCSV = () => {
    if (!combinedCSV) {
      toast({
        title: "❌ No data to download",
        variant: "destructive",
      });
      return;
    }
    const blob = new Blob([combinedCSV], { type: "text/csv;charset=utf-8;" });
    saveAs(
      blob,
      `indirect_attainment_${subject?.subjectCode || "subject"}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    toast({ title: "📥 CSV downloaded successfully" });
  };

  const resetAll = () => {
    setPartAData(null);
    setPartBData(null);
    setResults(null);
    setCombinedCSV("");
    setExistingData(null);
    setIsComputing(false);
    toast({ title: "🔄 Reset complete" });
  };

  return (
    <DashboardLayout
      title="Indirect CO Attainment"
      subtitle="Process Course Exit Survey (Part A + Part B) for NBA/NAAC compliance"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="space-y-4">
          <Card className="glass-card">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose subject..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.subjectCode} — {s.subjectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {subject && (
                <>
                  {/* 🔥 Existing Data Indicator */}
                  {existingData && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                      <div className="font-medium text-blue-800 mb-1">📊 Existing Data Found</div>
                      <div className="text-blue-700 space-y-1">
                        {existingData.slice(0, 3).map((co, i) => (
                          <div key={i}>CO{i + 1}: {co.percentage?.toFixed(1)}%</div>
                        ))}
                        {existingData.length > 3 && <div>...</div>}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full text-xs h-7"
                        onClick={resetAll}
                      >
                        Compute New Data
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <FileSpreadsheet className="w-4 h-4" />
                      Part A Survey CSV (Overall Satisfaction)
                    </Label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload("partA")}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-accent/80 w-full cursor-pointer"
                      disabled={isComputing || isSaving}
                    />
                    {partAData && (
                      <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                        ✓ {partAData.length} students loaded
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <FileSpreadsheet className="w-4 h-4" />
                      Part B Survey CSV (CO-wise Feedback)
                    </Label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload("partB")}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-accent/80 w-full cursor-pointer"
                      disabled={isComputing || isSaving}
                    />
                    {partBData && (
                      <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                        ✓ {partBData.length} students loaded
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={computeIndirectAttainment}
                    className="w-full gradient-accent text-accent-foreground"
                    disabled={!partAData || !partBData || isComputing || isSaving}
                  >
                    {isComputing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Computing...
                      </>
                    ) : (
                      "🚀 Compute Indirect Attainment"
                    )}
                  </Button>

                  {combinedCSV && (
                    <Button
                      onClick={downloadCombinedCSV}
                      className="w-full gradient-accent text-accent-foreground flex items-center gap-2"
                      variant="outline"
                      disabled={isSaving}
                    >
                      <Download className="w-4 h-4" />
                      Download Results CSV
                    </Button>
                  )}

                  <Button
                    onClick={resetAll}
                    variant="outline"
                    className="w-full"
                    disabled={isComputing || isSaving}
                  >
                    🔄 Reset All
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          {existingData && !results ? (
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">
                    Indirect CO Attainment — {subject?.subjectCode} (Existing)
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    Loaded from database
                  </div>
                </div>
                
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={existingData.map((co: any, i: number) => ({
                      co: `CO${i + 1}`,
                      percentage: co.percentage || 0,
                      level: getAttainmentLevel(co.percentage || 0),
                    }))}
                    margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="co" tick={{ fontSize: 12, fontWeight: 500 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="percentage" name="Indirect Attainment (%)" radius={[8, 8, 0, 0]} barSize={32}>
                      {existingData.map((co: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={LEVEL_COLORS[getAttainmentLevel(co.percentage || 0)]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : results ? (
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">
                    Indirect CO Attainment — {subject?.subjectCode}
                  </h3>
                  {isSaving && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving to database...
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {results.length} COs | {results[0]?.partAAvg || 0}% Part A
                  </div>
                </div>

                {/* Results Table */}
                <div className="overflow-x-auto mb-8">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-semibold">Course Outcome</th>
                        <th className="text-right p-4 font-semibold">Part A %</th>
                        <th className="text-right p-4 font-semibold">Part B %</th>
                        <th className="text-right p-4 font-semibold">Indirect %</th>
                        <th className="text-right p-4 font-semibold">Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr
                          key={r.coNumber}
                          className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-4 font-medium max-w-[200px] truncate">
                            CO{r.coNumber}: {r.coName}
                          </td>
                          <td className="text-right p-4 font-mono">{r.partAAvg}%</td>
                          <td className="text-right p-4 font-mono">{r.partBAvg}%</td>
                          <td className="text-right p-4 font-bold text-lg text-foreground">
                            {r.percentage}%
                          </td>
                          <td className="text-right p-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                r.level === 3
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                  : r.level === 2
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                                  : r.level === 1
                                  ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                              }`}
                            >
                              Level {r.level}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={results.map((r) => ({
                      co: `CO${r.coNumber}`,
                      percentage: r.percentage,
                      level: r.level,
                    }))}
                    margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="co"
                      tick={{ fontSize: 12, fontWeight: 500 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                      formatter={(value: number) => [`${value}%`, "Indirect Attainment"]}
                    />
                    <Legend />
                    <Bar
                      dataKey="percentage"
                      name="Indirect Attainment (%)"
                      radius={[8, 8, 0, 0]}
                      barSize={32}
                    >
                      {results.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={LEVEL_COLORS[entry.level] || LEVEL_COLORS[0]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card h-[400px] flex items-center justify-center">
              <div className="text-center space-y-4">
                <Target className="w-20 h-20 mx-auto mb-6 opacity-30 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-muted-foreground">
                    Ready to compute Indirect Attainment
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Select a subject, upload Part A (overall satisfaction) & Part B (CO-wise) CSV
                    files, then click Compute to generate NBA/NAAC compliant attainment levels.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default IndirectAttainmentPage;

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
import { DirectAttainment, getLevelLabel } from "@/types";
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
import {
  calculateStudentCO,
  calculateClassAttainment,
  StudentCO,
} from "@/utils/directCalculations";

const API_URL = "http://localhost:8000";

const LEVEL_COLORS = [
  "hsl(var(--level-0))",
  "hsl(var(--level-1))",
  "hsl(var(--level-2))",
  "hsl(var(--level-3))",
];

const DirectAttainmentPage: React.FC = () => {
  const { subjects } = useSubjects();
  const { toast } = useToast();

  const [selectedSubject, setSelectedSubject] = useState<string | "">("");
  const [assignmentData, setAssignmentData] = useState<number[][] | null>(null);
  const [internalData, setInternalData] = useState<number[][] | null>(null);
  const [results, setResults] = useState<DirectAttainment[] | null>(null);
  const [combinedCSV, setCombinedCSV] = useState("");
  const [isComputing, setIsComputing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingData, setExistingData] = useState<DirectAttainment[] | null>(null);

  const subject =
    subjects.find((s) => s.id === Number(selectedSubject)) || null;

  // 🔥 Load existing direct summary from backend
  const loadExistingData = useCallback(async () => {
    if (!selectedSubject) return;
    
    try {
      const response = await fetch(`${API_URL}/analytics/direct-summary/${selectedSubject}`);
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

  // 🔥 Save direct summary to backend
  const saveToBackend = async (attainment: DirectAttainment[]) => {
    if (!selectedSubject) return;
    
    try {
      setIsSaving(true);
      const response = await fetch(`${API_URL}/analytics/direct-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: selectedSubject,
          co_attainments: attainment.map(co => ({
            co: String(co.coNumber),
            percentage: co.percentage
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      toast({
        title: "💾 Direct Summary Saved!",
        description: "CO attainment saved to database for analytics"
      });
    } catch (error) {
      console.error("Save failed:", error);
      toast({
        title: "❌ Failed to save to database",
        description: "Results computed but not saved",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = useCallback(
    (type: "assignment" | "internal") =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
          skipEmptyLines: true,
          complete: (result) => {
            const rows = result.data as string[][];
            const studentRows = rows.slice(2).filter((row) =>
              row.slice(3).some((cell) => cell.toString().trim() !== "")
            );

            const numericData = studentRows.map((row) =>
              row.slice(3).map((val) => {
                const num = parseFloat(val.toString().replace(/,/g, ""));
                return isNaN(num) ? 0 : num;
              })
            );

            if (type === "assignment") {
              setAssignmentData(numericData);
            } else {
              setInternalData(numericData);
            }

            toast({
              title: "✅ File uploaded successfully",
              description: `${type} marks loaded (${numericData.length} students)`,
            });

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

  const computeAttainment = async () => {
    if (!assignmentData || !internalData) {
      toast({
        title: "❌ Missing Files",
        description: "Upload both Assignment and Internal files",
        variant: "destructive",
      });
      return;
    }

    setIsComputing(true);
    setResults(null);

    try {
      const totalStudents = Math.min(assignmentData.length, internalData.length);
      const studentResults: StudentCO[] = [];

      for (let i = 0; i < totalStudents; i++) {
        const assign = assignmentData[i];
        const internal = internalData[i];
        studentResults.push(calculateStudentCO(assign, internal));
      }

      const attainment = calculateClassAttainment(studentResults);
      setResults(attainment);

      // 🔥 SAVE TO BACKEND IMMEDIATELY
      await saveToBackend(attainment);

      if (studentResults.length > 0 && studentResults[0]?.cos?.length > 0) {
        const combinedRows = studentResults.map((student, i) => [
          i + 1,
          `Student ${i + 1}`,
          ...student.cos.map((co) =>
            Math.round(co.percentage * 100) / 100
          ),
        ]);
        const coHeaders = Array.from(
          { length: studentResults[0].cos.length },
          (_, i) => `CO${i + 1}`
        );
        const combinedHeader = ["No", "Student", ...coHeaders];
        setCombinedCSV(
          Papa.unparse({ fields: combinedHeader, data: combinedRows })
        );
      }

      toast({
        title: "✅ Computation Complete!",
        description: `Direct CO Attainment calculated for ${totalStudents} students | ${attainment.length} COs`,
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
      `direct_attainment_${subject?.subjectCode || "subject"}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    toast({ title: "📥 CSV downloaded successfully" });
  };

  const resetAll = () => {
    setAssignmentData(null);
    setInternalData(null);
    setResults(null);
    setCombinedCSV("");
    setExistingData(null);
    setIsComputing(false);
    toast({ title: "🔄 Reset complete" });
  };

  return (
    <DashboardLayout
      title="Direct CO Attainment"
      subtitle="Process Assignment & Internal marks for NBA/NAAC compliance"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="space-y-4">
          <Card className="glass-card">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Subject</Label>
                <Select
                  value={selectedSubject}
                  onValueChange={setSelectedSubject}
                >
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
                          <div key={i}>CO{i+1}: {co.percentage?.toFixed(1)}%</div>
                        ))}
                        {existingData.length > 3 && (
                          <div>...</div>
                        )}
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
                      Assignment Marks CSV
                    </Label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload("assignment")}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-accent/80 w-full cursor-pointer"
                      disabled={isComputing || isSaving}
                    />
                    {assignmentData && (
                      <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                        ✓ {assignmentData.length} students loaded
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <FileSpreadsheet className="w-4 h-4" />
                      Internal Marks CSV
                    </Label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload("internal")}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-accent/80 w-full cursor-pointer"
                      disabled={isComputing || isSaving}
                    />
                    {internalData && (
                      <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                        ✓ {internalData.length} students loaded
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={computeAttainment}
                    className="w-full gradient-accent text-accent-foreground"
                    disabled={!assignmentData || !internalData || isComputing || isSaving}
                  >
                    {isComputing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Computing...
                      </>
                    ) : (
                      "🚀 Compute Direct Attainment"
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
                    Direct CO Attainment — {subject?.subjectCode} (Existing)
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    Loaded from database
                  </div>
                </div>
                
                {/* Existing Data Chart */}
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={existingData.map((co: any, i: number) => ({
                      co: `CO${i + 1}`,
                      percentage: co.percentage || 0,
                      level: co.percentage >= 75 ? 3 : co.percentage >= 60 ? 2 : co.percentage >= 50 ? 1 : 0,
                    }))}
                    margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="co" tick={{ fontSize: 12, fontWeight: 500 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="percentage" name="Direct Attainment (%)" radius={[8, 8, 0, 0]} barSize={32}>
                      {existingData.map((co: any, index: number) => {
                        const level = co.percentage >= 75 ? 3 : co.percentage >= 60 ? 2 : co.percentage >= 50 ? 1 : 0;
                        return <Cell key={`cell-${index}`} fill={LEVEL_COLORS[level]} />;
                      })}
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
                    Direct CO Attainment — {subject?.subjectCode}
                  </h3>
                  {isSaving && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving to database...
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {results.length} COs | {results[0]?.totalStudents || 0} students
                  </div>
                </div>

                {/* Results Table */}
                <div className="overflow-x-auto mb-8">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-semibold">Course Outcome</th>
                        <th className="text-right p-4 font-semibold">Above 60%</th>
                        <th className="text-right p-4 font-semibold">Total</th>
                        <th className="text-right p-4 font-semibold">Attainment %</th>
                        <th className="text-right p-4 font-semibold">Level</th>
                        <th className="text-left p-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr
                          key={r.coNumber}
                          className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-4 font-medium">CO{r.coNumber}</td>
                          <td className="text-right p-4 font-mono">
                            {r.studentsAboveThreshold}
                          </td>
                          <td className="text-right p-4 font-mono">
                            {r.totalStudents}
                          </td>
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
                          <td className="p-4 text-left">
                            {r.level > 0 ? (
                              <span className="text-success text-sm font-medium">
                                {getLevelLabel(r.level)}
                              </span>
                            ) : (
                              <span className="text-destructive text-sm font-medium">
                                Not Attained
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Chart */}
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
                      formatter={(value: number) => [
                        `${value}%`,
                        "Direct Attainment",
                      ]}
                    />
                    <Legend />
                    <Bar
                      dataKey="percentage"
                      name="Direct Attainment (%)"
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
                    Ready to compute Direct Attainment
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Select a subject, upload Assignment & Internal CSV files,
                    then click Compute to generate NBA/NAAC compliant attainment
                    levels.
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

export default DirectAttainmentPage;

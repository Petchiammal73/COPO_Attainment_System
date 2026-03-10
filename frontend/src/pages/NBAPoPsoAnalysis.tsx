import React, { useState, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useSubjects } from "@/context/SubjectContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download, TrendingUp, Target, Loader2, Award, FileText,
  Users, GraduationCap, Upload, FileSpreadsheet, BarChart3
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  Cell
} from 'recharts';

const API_URL = "http://localhost:8000";
const PO_LABELS = ["PO1", "PO2", "PO3", "PO4", "PO5", "PO6", "PO7", "PO8", "PO9", "PO10", "PO11", "PO12", "PSO1", "PSO2", "PSO3"];

interface SurveyFile {
  name: string;
  fieldName: string;
  file: File | null;
}

interface FinalAttainmentRow {
  courseCode: string;
  cos: string[];
  direct: Record<string, number>;
  indirect: Record<string, number>;
  direct80: Record<string, number>;
  indirect20: Record<string, number>;
  final: Record<string, number>;
}

const LEVEL_COLORS = [
  '#ef4444', // Level 0 - Red
  '#f97316', // Level 1 - Orange  
  '#eab308', // Level 2 - Yellow
  '#22c55e'  // Level 3 - Green
];

const NBAIndirectAnalysisPage: React.FC = () => {
  const { subjects } = useSubjects();
  const { toast } = useToast();

  const [numSubjects, setNumSubjects] = useState(4);
  const [subjectSelections, setSubjectSelections] = useState<Record<number, number>>({});
  const [surveyFiles, setSurveyFiles] = useState<SurveyFile[]>([
    { name: "Exit Survey", fieldName: "exit_survey", file: null },
    { name: "Alumni Survey", fieldName: "alumni_survey", file: null },
    { name: "Employer Survey", fieldName: "employer_survey", file: null }
  ]);
  const [finalTable, setFinalTable] = useState<FinalAttainmentRow[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [step, setStep] = useState(1);

  const selectedSubjects = useMemo(() => 
    Object.values(subjectSelections).filter(Boolean) as number[], 
    [subjectSelections]
  );

  const availableSubjects = useMemo(() => 
    subjects.filter(s => !selectedSubjects.includes(s.id)),
    [subjects, selectedSubjects]
  );

  const displayValue = useCallback((value: number): string => {
    return parseFloat(value.toFixed(2)).toString();
  }, []);

  const calculateAverage = useCallback((data: FinalAttainmentRow[], field: keyof FinalAttainmentRow, po: string): number => {
    if (data.length === 0) return 0;
    const total = data.reduce((sum, row) => {
      const value = row[field]?.[po];
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
    return total / data.length;
  }, []);

  const getSubjectDisplay = useCallback((idx: number) => {
    const subjectId = subjectSelections[idx];
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? `${subject.courseCode} - ${subject.subjectCode}` : `Subject ${idx + 1}`;
  }, [subjects, subjectSelections]);

  const handleSubjectSelect = useCallback((idx: number, value: string) => {
    const id = Number(value);
    setSubjectSelections(prev => ({
      ...prev,
      [idx]: id
    }));
  }, []);

  const nextStep = useCallback(() => {
    if (selectedSubjects.length !== numSubjects) {
      toast({
        title: "❌ Invalid selection",
        description: `Please select exactly ${numSubjects} subjects`,
        variant: "destructive"
      });
      return;
    }
    setStep(2);
  }, [selectedSubjects.length, numSubjects, toast]);

  const processIndirectAnalysis = useCallback(async () => {
    const missingFiles = surveyFiles.some(f => !f.file);
    if (missingFiles) {
      toast({
        title: "❌ Missing files",
        description: "Please upload all 3 survey files (CSV/Excel)",
        variant: "destructive"
      });
      return;
    }

    if (selectedSubjects.length === 0) {
      toast({
        title: "❌ No subjects",
        description: "Please select subjects first",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append("subject_ids", selectedSubjects.join(','));
    
    surveyFiles.forEach(({ fieldName, file }) => {
      if (file) formData.append(fieldName, file);
    });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/analytics/indirect/analysis`, {
        method: "POST",
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        const tableData = (result.final_table || []).map((row: any, idx: number) => {
          const tableRow: FinalAttainmentRow = {
            courseCode: row.courseCode || `C${idx + 101}`,
            cos: row.cos || [],
            direct: {},
            indirect: {},
            direct80: {},
            indirect20: {},
            final: {}
          };

          PO_LABELS.forEach(po => {
            tableRow.direct[po] = Number(row.direct?.[po]) || 0;
            tableRow.indirect[po] = Number(row.indirect?.[po]) || 0;
            tableRow.direct80[po] = Number(row.direct80?.[po]) || 0;
            tableRow.indirect20[po] = Number(row.indirect20?.[po]) || 0;
            tableRow.final[po] = Number(row.final?.[po]) || 0;
          });

          return tableRow;
        });
        
        setFinalTable(tableData);
        setStep(3);
        toast({
          title: `✅ NBA Analysis Complete`,
          description: `${selectedSubjects.length} subjects × 3 surveys = ${PO_LABELS.length} POs/PSOs analyzed (Decimals)`
        });
      } else {
        throw new Error(result.detail || "Analysis failed");
      }
    } catch (error) {
      toast({
        title: "❌ Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedSubjects, surveyFiles, toast]);

  const handleFileUpload = useCallback((index: number, file: File | null) => {
    setSurveyFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, file } : f
    ));
  }, []);

  const detailedTableData = useMemo(() => finalTable, [finalTable]);

  const getTableValue = useCallback((row: FinalAttainmentRow, po: string): number => {
    if (!['Direct', 'Indirect', 'Direct (80%)', 'Indirect (20%)', 'FINAL ATTAINMENT'].includes(row.courseCode)) {
      return row.direct?.[po] ?? 0;
    }
    
    switch(row.courseCode) {
      case 'Direct': return row.direct?.[po] ?? 0;
      case 'Indirect': return row.indirect?.[po] ?? 0;
      case 'Direct (80%)': return row.direct80?.[po] ?? 0;
      case 'Indirect (20%)': return row.indirect20?.[po] ?? 0;
      case 'FINAL ATTAINMENT': return row.final?.[po] ?? 0;
      default: return row.direct?.[po] ?? 0;
    }
  }, []);

  // 🔥 COMBINED CHART DATA - PO1-PO12 + PSO1-PSO3 (15 total)
  const combinedChartData = useMemo(() => {
    const finalRow = detailedTableData.find(row => row.courseCode === 'FINAL ATTAINMENT');
    if (!finalRow) return [];
    
    return PO_LABELS.map(po => ({
      name: po,
      attainment: finalRow.final[po] || 0,
      level: Math.min(3, Math.floor((finalRow.final[po] || 0) / 0.75)) // 0-3 scale
    }));
  }, [detailedTableData]);

  const downloadPDF = useCallback(() => {
    if (!detailedTableData.length) return;
    
    const doc = new jsPDF('landscape');
    doc.setFontSize(10);
    doc.text(`NBA COs vs POs/PSOs Analysis - ${detailedTableData.length} Subjects (Decimals)`, 14, 20);
    
    const tableBody = detailedTableData.map(row => {
      const rowData = [row.courseCode];
      PO_LABELS.forEach(po => {
        rowData.push(parseFloat(getTableValue(row, po).toFixed(2)));
      });
      return rowData;
    });

    import('jspdf-autotable').then(({ default: autoTable }) => {
      autoTable(doc, {
        startY: 30,
        head: [["Course Code", ...PO_LABELS]],
        body: tableBody,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], fontSize: 8 },
        columnStyles: { 0: { cellWidth: 30 } },
        didParseCell: (data) => {
          const rowIndex = data.row.index;
          const isSummaryRow = rowIndex >= detailedTableData.length - 5;
          if (isSummaryRow) {
            data.cell.styles.fillColor = [245, 245, 245];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
      doc.save(`NBA_Analysis_Decimals_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "✅ PDF Exported (Decimals)" });
    });
  }, [detailedTableData, getTableValue, toast]);

  const getCellColor = (value: number): string => {
    const val = parseFloat(value.toFixed(2));
    if (val >= 2.5) return 'text-green-700 bg-green-100/80 font-bold';
    if (val >= 1.5) return 'text-yellow-700 bg-yellow-100/80 font-bold';
    if (val >= 0.5) return 'text-orange-700 bg-orange-100/80 font-bold';
    return 'text-red-700 bg-red-100/80 font-bold';
  };

  return (
    <DashboardLayout title="NBA COs vs POs/PSOs" >
      <div className="max-w-7xl mx-auto space-y-6 p-4">
        {/* STEP 1: SUBJECT SELECTION (UNCHANGED) */}
        {step === 1 && (
          <Card className="glass-card border-0 shadow-sm">
            <CardHeader className="pb-3">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <GraduationCap className="w-4 h-4" /> Select Subjects
              </h3>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="flex gap-3 items-end">
                <div className="space-y-1 flex-1 min-w-[100px]">
                  <Label className="text-sm font-medium">Number of Subjects</Label>
                  <Input 
                    type="number" 
                    value={numSubjects} 
                    min={1} 
                    max={10} 
                    className="h-9 text-xs"
                    onChange={(e) => { 
                      setNumSubjects(Number(e.target.value)); 
                      setSubjectSelections({}); 
                    }} 
                  />
                </div>
                <Button onClick={() => setSubjectSelections({})} variant="outline" size="sm" className="h-9 px-3 text-sm">
                  Clear All
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
  {Array.from({ length: numSubjects }, (_, i) => i).map(idx => {
    const otherSelectedIds = Object.entries(subjectSelections)
      .filter(([key]) => Number(key) !== idx)
      .map(([, id]) => id).filter(Boolean);
    
    const availableForThisDropdown = subjects.filter(s => !otherSelectedIds.includes(s.id));

    return (
      <div key={idx} className="space-y-2 p-3 border border-muted/50 rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <Label className="font-medium text-sm">Subject {idx + 1}</Label>
          <Badge variant="secondary" className="text-sm h-4 px-2">
            {selectedSubjects.length}/{numSubjects}
          </Badge>
        </div>
        <Select value={subjectSelections[idx]?.toString() || ""} onValueChange={(val) => handleSubjectSelect(idx, val)}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-48">
            {availableForThisDropdown.map(s => (
              <SelectItem key={s.id} value={s.id.toString()} className="text-xs">
                {s.courseCode} - {s.subjectCode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  })}
</div>

              <Button 
                className="w-full h-10 text-sm shadow-md" 
                disabled={selectedSubjects.length !== numSubjects} 
                onClick={nextStep}
              >
                Next: Upload Surveys → 
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: FILE UPLOAD (UNCHANGED) */}
        {step === 2 && (
          <Card className="glass-card border-0 shadow-sm">
            <CardHeader className="pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-center">
                <Users className="w-5 h-5" /> Upload Survey Files
              </h3>
              <p className="text-xs text-muted-foreground text-center">CSV or Excel format required</p>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                {surveyFiles.map(({ name, fieldName }, idx) => (
                  <div key={fieldName} className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1">{name}</Label>
                    <div className={`relative border-2 border-dashed rounded-lg p-6 text-center text-xs transition-colors ${
                      surveyFiles[idx].file 
                        ? 'border-green-200 bg-green-50/50' 
                        : 'border-muted/50 hover:border-primary/50'
                    }`}>
                      <Input 
                        id={`file-${idx}`} 
                        type="file" 
                        accept=".csv,.xlsx" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => { 
                          const file = e.target.files?.[0]; 
                          handleFileUpload(idx, file || null); 
                        }} 
                      />
                      <div className="space-y-1 pointer-events-none">
                        <Upload className={`w-8 h-8 mx-auto ${surveyFiles[idx].file ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <p className="font-medium text-xs">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {surveyFiles[idx].file?.name || "Click to upload CSV/Excel"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(1)} 
                  className="flex-1 h-10 text-sm"
                >
                  ← Back to Subjects
                </Button>
                <Button 
                  onClick={processIndirectAnalysis} 
                  className="flex-1 h-10 text-sm shadow-md" 
                  disabled={isAnalyzing || surveyFiles.some(f => !f.file)}
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <TrendingUp className="w-4 h-4 mr-2" />
                  )}
                  Analyze NBA Data
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: RESULTS */}
        {step === 3 && (
          <div className="space-y-6">
            {/* EXECUTIVE SUMMARY */}
            <Card className="glass-card border-0 shadow-lg">
              <CardHeader className="pb-3">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Award className="w-5 h-5" /> NBA Analysis Complete
                </h3>
              </CardHeader>
              <CardContent className="p-6">
  {(() => {
    // 🔥 FILTER ONLY COURSE ROWS (exclude 5 summary rows)
    const courseRows = finalTable.filter(row => 
      !['Direct', 'Indirect', 'Direct (80%)', 'Indirect (20%)', 'FINAL ATTAINMENT'].includes(row.courseCode)
    );
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
        <div className="space-y-2 p-4 bg-blue-50 rounded-xl">
          <div className="text-2xl font-black text-blue-600">
            {courseRows.length}
          </div>
          <div className="text-sm font-medium text-blue-700">Courses Analyzed</div>
        </div>
        <div className="space-y-2 p-4 bg-emerald-50 rounded-xl">
          <div className="text-2xl font-black text-emerald-600">
            {PO_LABELS.slice(0, 12).filter(po => calculateAverage(courseRows, 'final', po) >= 2).length}/12
          </div>
          <div className="text-sm font-medium text-emerald-700">POs ≥ 2</div>
        </div>
        <div className="space-y-2 p-4 bg-purple-50 rounded-xl">
          <div className="text-2xl font-black text-purple-600">
            {PO_LABELS.slice(12).filter(po => calculateAverage(courseRows, 'final', po) >= 2).length}/3
          </div>
          <div className="text-sm font-medium text-purple-700">PSOs ≥ 2</div>
        </div>
      </div>
    );
  })()}
</CardContent>

            </Card>

            {/* MAIN NBA TABLE */}
            <Card className="glass-card border-0 shadow-xl">
              <CardHeader className="pb-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold flex items-center gap-3">
                    📊 COs Vs POs/PSOs Attainment Table
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    Direct + Indirect (80%+20%)
                  </p>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="min-w-[1400px]">
                  <table className="w-full text-xs border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                        <th className="p-2 text-left font-bold border border-white/30 w-32 text-lg" rowSpan={2}>
                          Course Code
                        </th>
                        <th className="p-2 text-center font-bold border border-white/30 bg-indigo-700 text-lg" colSpan={12}>
                          COs Vs POs
                        </th>
                        <th className="p-2 text-center font-bold border border-white/30 bg-purple-700 text-lg" colSpan={3}>
                          COs Vs PSOs
                        </th>
                      </tr>
                      <tr className="bg-gray-100 text-gray-800">
                        {['PO1','PO2','PO3','PO4','PO5','PO6','PO7','PO8','PO9','PO10','PO11','PO12'].map(po => (
                          <th key={po} className="p-1.5 text-center font-bold text-sm border border-gray-300 bg-indigo-50 w-14">{po}</th>
                        ))}
                        {['PSO1','PSO2','PSO3'].map(pso => (
                          <th key={pso} className="p-1.5 text-center font-bold text-sm border border-gray-300 bg-purple-50 w-14">{pso}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detailedTableData.map((row, rowIdx) => {
                        const isSummaryRow = ['Direct', 'Indirect', 'Direct (80%)', 'Indirect (20%)', 'FINAL ATTAINMENT'].includes(row.courseCode);
                        
                        return (
                          <tr key={`${row.courseCode}-${rowIdx}`} className={`hover:bg-gray-50/50 ${isSummaryRow ? 'font-bold border-t-2' : ''}`}>
                            <td className={`p-2 font-semibold text-sm border border-gray-300 ${
                              isSummaryRow 
                                ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border-blue-300' 
                                : 'bg-indigo-50/50'
                            }`}>
                              {row.courseCode}
                            </td>
                            {PO_LABELS.map(po => {
                              const value = getTableValue(row, po);
                              return (
                                <td key={po} className={`p-2 text-center font-mono border border-gray-300 ${getCellColor(value)} ${isSummaryRow ? 'border-2' : ''}`}>
                                  <div className={`font-black text-sm leading-none ${isSummaryRow ? 'drop-shadow-sm' : ''}`}>
                                    {displayValue(value)}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 🔥 COMBINED FINAL ATTAINMENT CHART - AFTER TABLE */}
            <Card className="glass-card border-0 shadow-xl">
              <CardHeader className="pb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" /> Final Attainment Summary (POs + PSOs)
                </h3>
                <p className="text-xs text-muted-foreground">All 15 outcomes (PO1-PO12, PSO1-PSO3) | Y-axis: Levels 0-3 | Color-coded</p>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={combinedChartData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11, fontWeight: 500, angle: -45, textAnchor: 'end' }} 
                      stroke="hsl(var(--muted-foreground))"
                      height={70}
                    />
                    <YAxis 
                      domain={[0, 3]} 
                      ticks={[0, 1, 2, 3]}
                      tick={{ fontSize: 12, fontWeight: 600 }} 
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(2)}`, 'Final Attainment']} 
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    />
                    <Legend />
                    <Bar dataKey="attainment" name="Final Attainment (0-3)" barSize={22} radius={[4, 4, 0, 0]}>
                      {combinedChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={LEVEL_COLORS[entry.level] || LEVEL_COLORS[0]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* EXPORT BUTTONS */}
            <Card className="glass-card border-0 shadow-sm">
              <CardContent className="flex flex-col sm:flex-row gap-3 p-6">
                <Button 
                  onClick={downloadPDF} 
                  className="flex-1 h-12 text-sm shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700" 
                  disabled={!detailedTableData.length}
                >
                  <Download className="w-5 h-5 mr-2" /> 📄 Export PDF (Decimals)
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 text-sm border-2" 
                  onClick={() => setStep(1)}
                >
                  🔄 New Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NBAIndirectAnalysisPage;

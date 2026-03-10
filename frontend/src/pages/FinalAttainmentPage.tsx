import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Target, Award, Download, FileText, Loader2, GraduationCap, AlertCircle, Database } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend } from "recharts";
import { useSubjects } from "@/context/SubjectContext";
import { useToast } from "@/hooks/use-toast";

const API_URL = "http://localhost:8000";

interface COAttainment {
  co: string;
  direct: number;
  indirect: number;
  final: number;
}

interface POAttainment {
  poNumber: string;
  value: number;
  level: number;
}

interface PSOAttainment {
  psoNumber: string;
  value: number;
  level: number;
}

const CO_COLORS = ["#1e40af", "#059669", "#7c3aed", "#d97706", "#dc2626"];
const PO_PSO_LABELS = ["PO1", "PO2", "PO3", "PO4", "PO5", "PO6", "PO7", "PO8", "PO9", "PO10", "PO11", "PO12", "PSO1", "PSO2"];
const PO_LABELS = ["PO1", "PO2", "PO3", "PO4", "PO5", "PO6", "PO7", "PO8", "PO9", "PO10", "PO11", "PO12"];
const PSO_LABELS = ["PSO1", "PSO2"];

const getLevel = (value: number): number => {
  if (value >= 75) return 3;
  if (value >= 60) return 2;
  if (value >= 50) return 1;
  return 0;
};

const fetchAnalyticsData = async (subjectId: string) => {
  console.log("🔍 Fetching from:", {
    direct: `${API_URL}/analytics/direct-summary/${subjectId}`,
    indirect: `${API_URL}/analytics/indirect-summary/${subjectId}`,
    matrix: `${API_URL}/analytics/copo-pso-matrix/${subjectId}`
  });

  const [directRes, indirectRes, matrixRes] = await Promise.all([
    fetch(`${API_URL}/analytics/direct-summary/${subjectId}`).catch(() => null),
    fetch(`${API_URL}/analytics/indirect-summary/${subjectId}`).catch(() => null),
    fetch(`${API_URL}/analytics/copo-pso-matrix/${subjectId}`).catch(() => null),
  ]);

  const directData = directRes?.ok ? await directRes.json() : { co_attainments: [] };
  const indirectData = indirectRes?.ok ? await indirectRes.json() : { co_attainments: [] };
  const matrixData = matrixRes?.ok ? await matrixRes.json() : { matrix: [] };

  console.log("📊 Backend data loaded:", {
    direct: directData.co_attainments?.length || 0,
    indirect: indirectData.co_attainments?.length || 0,
    matrix: matrixData.matrix?.length || 0
  });

  return { directData, indirectData, matrixData };
};

const FinalAttainmentPage: React.FC = () => {
  const { subjects } = useSubjects();
  const { toast } = useToast();
  
  const [selectedSubject, setSelectedSubject] = useState("");
  const [coData, setCoData] = useState<COAttainment[]>([]);
  const [poData, setPoData] = useState<POAttainment[]>([]);
  const [psoData, setPsoData] = useState<PSOAttainment[]>([]);
  const [matrixData, setMatrixData] = useState<number[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const subject = subjects.find((s) => s.id === selectedSubject);

  // 🔥 FIXED: Define these FIRST before using them
  const hasData = coData.length > 0;

  const loadAnalyticsData = useCallback(async (subjectId: string) => {
    if (!subjectId) {
      setCoData([]);
      setPoData([]);
      setPsoData([]);
      setMatrixData([]);
      setFetchError(null);
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    
    try {
      const { directData, indirectData, matrixData: fetchedMatrix } = await fetchAnalyticsData(subjectId);

      const directCOs = directData.co_attainments || [];
      const indirectCOs = indirectData.co_attainments || [];
      const matrixArr = fetchedMatrix.matrix || [];

      // Calculate Final COs (80% Direct + 20% Indirect)
      const finalCO: COAttainment[] = directCOs.map((d: any, index: number) => {
        const directVal = Number(d.percentage) || 0;
        const indirectVal = Number(indirectCOs[index]?.percentage) || 0;
        const finalVal = Number((directVal * 0.8 + indirectVal * 0.2).toFixed(1));
        return { co: `CO${index + 1}`, direct: directVal, indirect: indirectVal, final: finalVal };
      });

      setCoData(finalCO);
      setMatrixData(matrixArr);

      // Calculate PO attainments
      const poResults: POAttainment[] = PO_LABELS.map((label, poIndex) => {
        let numerator = 0;
        let denominator = 0;
        finalCO.forEach((co, coIndex) => {
          const mapping = matrixArr[coIndex]?.[poIndex] || 0;
          if (mapping > 0) {
            numerator += co.final * mapping;
            denominator += mapping;
          }
        });
        const value = denominator === 0 ? 0 : Number((numerator / denominator).toFixed(1));
        return { poNumber: label, value, level: getLevel(value) };
      });

      // Calculate PSO attainments
      const psoResults: PSOAttainment[] = PSO_LABELS.map((label, psoIndex) => {
        let numerator = 0;
        let denominator = 0;
        finalCO.forEach((co, coIndex) => {
          const mapping = matrixArr[coIndex]?.[PO_LABELS.length + psoIndex] || 0;
          if (mapping > 0) {
            numerator += co.final * mapping;
            denominator += mapping;
          }
        });
        const value = denominator === 0 ? 0 : Number((numerator / denominator).toFixed(1));
        return { psoNumber: label, value, level: getLevel(value) };
      });

      setPoData(poResults);
      setPsoData(psoResults);

      toast({
        title: "✅ Data Loaded",
        description: `${finalCO.length} COs analyzed successfully`
      });

    } catch (error: any) {
      const errorMsg = error.message || "Failed to fetch analytics data";
      setFetchError(errorMsg);
      console.error("Load error:", error);
      toast({
        title: "❌ Analytics Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // 🔥 FIXED: Define attainmentStatus BEFORE save function
  const attainmentStatus = useMemo(() => {
    const avgCO = coData.length ? (coData.reduce((s, c) => s + c.final, 0) / coData.length).toFixed(1) : "0";
    const coL3Count = coData.filter(c => c.final >= 75).length;
    const poL2Count = poData.filter(p => p.level >= 2).length;
    const psoL2Count = psoData.filter(p => p.level >= 2).length;
    const overallAttained = parseFloat(avgCO) >= 70 && coL3Count >= 4 && poL2Count >= 8 && psoL2Count >= 1;

    return { avgCO, coL3Count, poL2Count, psoL2Count, overallAttained, coDataLength: coData.length, poDataLength: poData.length, psoDataLength: psoData.length };
  }, [coData, poData, psoData]);

  // 🔥 FIXED: Now saveFinalAttainmentToBackend can use attainmentStatus safely
const saveFinalAttainmentToBackend = useCallback(async () => {
  if (!selectedSubject || !hasData) {
    toast({ title: "⚠️ No Data", description: "Select subject and load data first", variant: "destructive" });
    return;
  }

  try {
    setIsSaving(true);
    const token = localStorage.getItem('token');

    const finalAttainmentData = {
      subject_id: String(selectedSubject),  // "2"
      direct_percentages: coData.map(co => co.direct),
      indirect_percentages: coData.map(co => co.indirect),
      final_percentages: coData.map(co => co.final),
      final_levels: coData.map(co => getLevel(co.final))
    };

    console.log("💾 Sending to /analytics/final-attainment:", finalAttainmentData);

    // 🔥 CORRECT ENDPOINT - Matches your analytics router
    const response = await fetch(`${API_URL}/analytics/final-attainment`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token && { "Authorization": `Bearer ${token}` })
      },
      body: JSON.stringify(finalAttainmentData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    toast({
      title: "💾 Final Attainment Saved!",
      description: `${coData.length} COs → Backend`,
    });

  } catch (error: any) {
    console.error("Final save failed:", error);
    toast({
      title: "⚠️ Save Failed",
      description: `Computed locally ✓ (${error.message})`,
      variant: "destructive",
    });
  } finally {
    setIsSaving(false);
  }
}, [selectedSubject, coData, toast, hasData]);

  // Load data when subject changes
  useEffect(() => {
    loadAnalyticsData(selectedSubject);
  }, [selectedSubject, loadAnalyticsData]);

  const flippedCOPOData = useMemo(() => {
    if (!coData.length || !matrixData.length) {
      return [];
    }

    return PO_PSO_LABELS.map((poPso, poPsoIndex) => {
      const row: any = { po: poPso };
      coData.slice(0, 5).forEach((co, coIndex) => {
        const mapping = matrixData[coIndex]?.[poPsoIndex] ?? 0;
        let level = 0;
        if (mapping > 0) {
          level = getLevel(co.final);
        }
        row[co.co] = level;
      });
      return row;
    });
  }, [coData, matrixData]);

  const nbaSuggestions = useMemo(() => {
    if (!coData.length || !poData.length || !psoData.length) return [];

    const weakCOs = coData.filter(co => co.final < 60).map(co => co.co);
    const strongCOs = coData.filter(co => co.final >= 75).map(co => co.co);
    const lowPOs = poData.filter(po => po.level < 2).slice(0, 3).map(po => po.poNumber);
    const highPOCount = poData.filter(po => po.level >= 2).length;
    const highPSOCount = psoData.filter(pso => pso.level >= 2).length;

    const suggestions: string[] = [];

    if (attainmentStatus.overallAttained) {
      suggestions.push(
        `${strongCOs.length}/${coData.length} COs at L3: ${strongCOs.join(', ')} performing excellently`,
        `${highPOCount}/12 POs at L2+: Strong program outcome coverage`,
        `${highPSOCount}/2 PSOs at L2+: Excellent specific outcome coverage`,
        "SAR Ready: Include CO-PO-PSO matrix in Criterion 3.2.2",
        "PAC Meeting: Present attainment analysis for validation",
        "NBA Compliant: Ready for SAR P18 template submission"
      );
    } else {
      if (weakCOs.length > 0) {
        suggestions.push(
          `Improve ${weakCOs.join(', ')}: Add remedial teaching sessions`,
          `CO-PO-PSO Mapping: Review correlations for weak outcomes`
        );
      }
      
      if (lowPOs.length > 0) {
        suggestions.push(
          `PO Focus: Enhance ${lowPOs.join(', ')} through targeted activities`
        );
      }
      
      suggestions.push(
        `Target: Raise ${parseFloat(attainmentStatus.avgCO)}% to 70%+ average`,
        "PDCA Cycle: Implement continuous improvement actions",
        "Assessment: Add quizzes/projects for weak COs"
      );
    }

    return suggestions;
  }, [coData, poData, psoData, attainmentStatus]);

  const downloadReport = useCallback(() => {
    if (!subject) return;
    
    const weakCOs = coData.filter(co => co.final < 60).map(co => co.co);
    const strongCOs = coData.filter(co => co.final >= 75).map(co => co.co);
    
    const report = `NBA FINAL ATTAINMENT ANALYSIS REPORT (PO + PSO)
Course: ${subject.subjectCode} - ${subject.subjectName}
Generated: ${new Date().toLocaleDateString()}

ATTAINMENT SUMMARY:
Average CO Attainment: ${attainmentStatus.avgCO}%
COs at Level 3: ${attainmentStatus.coL3Count}/${attainmentStatus.coDataLength}
POs at Level 2+: ${attainmentStatus.poL2Count}/${attainmentStatus.poDataLength}
PSOs at Level 2+: ${attainmentStatus.psoL2Count}/${attainmentStatus.psoDataLength}

${attainmentStatus.overallAttained ? 'STATUS: ACHIEVED (NBA Compliant)' : 'STATUS: ACTION REQUIRED'}

${attainmentStatus.overallAttained 
  ? `STRONG COs: ${strongCOs.join(', ')}`
  : `WEAK COs: ${weakCOs.join(', ')} - Needs remedial action`
}`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${subject.subjectCode}_Final_Attainment_PO_PSO_Report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [subject, coData, attainmentStatus]);

  const downloadChartPdf = async () => {
    if (!chartRef.current || !subject) {
      toast({
        title: "Error",
        description: "Chart not ready or no subject selected",
        variant: "destructive",
      });
      return;
    }

    setPdfLoading(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: chartRef.current.scrollWidth,
        height: chartRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 190;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 20;
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      if (heightLeft > 0) {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, 0, imgWidth, imgHeight);
      }

      const coAnalysis = coData.map(co => `${co.co}: ${(co.final).toFixed(1)}% (L${getLevel(co.final)})`).join('\n');
      const poAnalysis = poData.map(po => `${po.poNumber}: ${(po.value).toFixed(1)}% (L${po.level})`).join('\n');
      const psoAnalysis = psoData.map(pso => `${pso.psoNumber}: ${(pso.value).toFixed(1)}% (L${pso.level})`).join('\n');

      pdf.setFontSize(14);
      pdf.text('NBA Criterion 3.2.2 - CO-PO-PSO Attainment Analysis', 10, position + imgHeight + 15);
      
      pdf.setFontSize(11);
      pdf.text(`Subject: ${subject.subjectCode} - ${subject.subjectName}`, 10, position + imgHeight + 25);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 10, position + imgHeight + 33);
      
      pdf.setFontSize(10);
      pdf.text('Chart Specifications:', 10, position + imgHeight + 45);
      pdf.text('- X-Axis: Program Outcomes (PO1-PO12) + PSOs (PSO1-PSO2)', 15, position + imgHeight + 53);
      pdf.text('- Y-Axis: CO Attainment Levels (L0=0%, L1≥50%, L2≥60%, L3≥75%)', 15, position + imgHeight + 61);
      pdf.text('- Colors: CO1=Blue, CO2=Green, CO3=Purple, CO4=Orange, CO5=Red', 15, position + imgHeight + 69);
      
      pdf.text('Course Outcome (CO) Attainment:', 10, position + imgHeight + 85);
      const coSplit = pdf.splitTextToSize(coAnalysis, 175);
      pdf.text(coSplit, 15, position + imgHeight + 93);
      
      pdf.text('Program Outcome (PO) Attainment:', 10, position + imgHeight + 130);
      const poSplit = pdf.splitTextToSize(poAnalysis, 175);
      pdf.text(poSplit, 15, position + imgHeight + 138);
      
      pdf.text('Program Specific Outcome (PSO) Attainment:', 10, position + imgHeight + 180);
      const psoSplit = pdf.splitTextToSize(psoAnalysis, 175);
      pdf.text(psoSplit, 15, position + imgHeight + 188);

      pdf.setFontSize(12);
      pdf.text(`SUMMARY: Avg CO=${attainmentStatus.avgCO}%, L3 COs=${attainmentStatus.coL3Count}/${coData.length}, L2+ POs=${attainmentStatus.poL2Count}/12, L2+ PSOs=${attainmentStatus.psoL2Count}/2`, 10, position + imgHeight + 220);

      pdf.save(`${subject.subjectCode}_CO_PO_PSO_Attainment_Chart.pdf`);
      toast({
        title: "✅ PDF Downloaded",
        description: "Complete CO-PO-PSO Chart PDF saved!",
      });
    } catch (error) {
      toast({
        title: "❌ PDF Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <DashboardLayout title="Final CO-PO-PSO Attainment" subtitle="NBA Criterion 3.2.2 Compliance Analysis">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Card */}
        <div className="max-w-lg mx-auto mb-8">
          <Card className="border shadow-md">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2 text-center">
                <Label className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Course Selection
                </Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select course for NBA analysis" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.subjectCode} — {s.subjectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasData && (
                <div className="space-y-3 pt-4 border-t">
                  {/* 🔥 SAVE BUTTON - NOW WORKS */}
                  <Button 
                    onClick={saveFinalAttainmentToBackend}
                    disabled={isSaving || isLoading || pdfLoading}
                    className="w-full h-10 text-sm font-medium shadow-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                    size="sm"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Database className="w-4 h-4 mr-2" />
                    )}
                    💾 Save Final Attainment to Backend
                  </Button>

                  <Button 
                    onClick={downloadChartPdf}
                    disabled={pdfLoading || isSaving || isLoading}
                    className="w-full h-10 text-sm font-medium shadow-sm"
                    size="sm"
                  >
                    {pdfLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    Download CO-PO-PSO Chart PDF
                  </Button>
                  
                  <Button 
                    onClick={downloadReport}
                    variant="outline"
                    className="w-full h-10 text-sm font-medium"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PO-PSO Report
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-center">
                    <div className="p-2 bg-muted rounded">
                      <div className="font-mono font-semibold text-sm">{coData.length}</div>
                      <div className="text-muted-foreground">COs</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="font-mono font-semibold text-sm">{poData.length + psoData.length}</div>
                      <div className="text-muted-foreground">PO+PSO</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rest of JSX remains exactly the same... */}
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 bg-muted/50 rounded-lg p-8">
              <div className="text-center space-y-3">
                <Loader2 className="w-12 h-12 mx-auto animate-spin text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Fetching NBA CO-PO-PSO data...</p>
              </div>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center h-64 max-w-md mx-auto text-center">
              <div className="w-20 h-20 bg-destructive/10 border-2 border-destructive/20 rounded-lg flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
              <h3 className="text-lg font-medium text-destructive mb-2">Data Fetch Error</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                {fetchError}. Check console for details.
              </p>
              <Button 
                variant="outline" 
                onClick={() => loadAnalyticsData(selectedSubject)}
                className="gap-2"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Retry
              </Button>
            </div>
          ) : hasData ? (
            <>
              <div ref={chartRef} className="max-w-7xl mx-auto mb-8">
                <Card className="border shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-3">
                      <h2 className="text-xl font-semibold">Final CO → PO/PSO Attainment Matrix</h2>
                      <div className={`px-3 py-1 rounded-md text-xs font-medium ${
                        attainmentStatus.overallAttained
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {attainmentStatus.overallAttained ? 'NBA Compliant' : 'Improvement Needed'}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Program Outcomes (PO1-PO12) + Program Specific Outcomes (PSO1-PSO2)
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="px-6 pb-6">
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={flippedCOPOData} layout="horizontal" barCategoryGap="20%">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis 
                            dataKey="po"
                            tick={{ fontSize: 10, fontWeight: 500, fill: 'hsl(var(--muted-foreground))', textAnchor: 'end' }}
                            stroke="hsl(var(--muted-foreground))"
                            tickLine={false}
                            axisLine={false}
                            height={70}
                          />
                          <YAxis 
                            domain={[0, 3]}
                            ticks={[0, 1, 2, 3]}
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            stroke="hsl(var(--muted-foreground))"
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip 
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 6,
                              fontSize: 12
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '10px' }}
                            iconSize={10}
                            iconType="rect"
                          />
                          {coData.slice(0, 5).map((co, index) => (
                            <Bar 
                              key={co.co} 
                              dataKey={co.co} 
                              name={co.co} 
                              barSize={20} 
                              radius={[4, 4, 0, 0]}
                            >
                              {flippedCOPOData.map((entry, entryIndex) => (
                                <Cell 
                                  key={`${co.co}-${entryIndex}`} 
                                  fill={CO_COLORS[index] || "#6b7280"} 
                                />
                              ))}
                            </Bar>
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="max-w-2xl mx-auto">
                <Card className="border shadow-lg">
                  <CardHeader className="pb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
                      <Award className="w-4 h-4" />
                      NBA Criterion 3.2.2 Action Plan
                    </h3>
                    <div className="grid grid-cols-3 gap-3 text-xs text-center mb-4">
                      <div className="p-3 bg-muted/50 rounded-md">
                        <div className="font-mono font-semibold">{attainmentStatus.avgCO}%</div>
                        <div className="text-muted-foreground">Avg CO</div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-md">
                        <div className="font-mono font-semibold">
                          L3: {attainmentStatus.coL3Count}/{attainmentStatus.coDataLength}
                        </div>
                        <div className="text-muted-foreground">COs</div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-md">
                        <div className="font-mono font-semibold">
                          L2+: {attainmentStatus.poL2Count}/{attainmentStatus.poDataLength} POs<br className="sm:hidden"/> 
                          {attainmentStatus.psoL2Count}/{attainmentStatus.psoDataLength} PSOs
                        </div>
                        <div className="text-muted-foreground">PO-PSO</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {nbaSuggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border-l-4 border-muted bg-muted/30 rounded-r-lg hover:bg-muted/50 transition-colors">
                        <div className="w-6 h-6 flex items-center justify-center rounded-sm font-semibold text-xs bg-muted-foreground/20 text-muted-foreground flex-shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <div className="text-sm leading-relaxed flex-1">
                          {suggestion}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : selectedSubject ? (
            <div className="flex flex-col items-center justify-center h-64 max-w-md mx-auto text-center">
              <div className="w-20 h-20 bg-muted/50 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No Data Available</h3>
              <p className="text-sm text-muted-foreground">
                Complete Direct → Indirect → CO-PO-PSO mapping in backend first.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FinalAttainmentPage;

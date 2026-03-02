import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  TrendingUp,
  Table,
  Award,
  Loader2,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSubjects } from "@/context/SubjectContext";

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

interface COPOChartRow {
  po: string;
  [key: string]: number | string;
}

const PO_LABELS = [
  "PO1", "PO2", "PO3", "PO4", "PO5", "PO6",
  "PO7", "PO8", "PO9", "PO10", "PO11", "PO12",
  "PSO1", "PSO2", "PSO3"
];

// 🔥 FIXED COLORS - ONE COLOR PER CATEGORY
const DIRECT_COLOR = "#3b82f6";    // Blue for ALL Direct bars
const INDIRECT_COLOR = "#10b981";  // Green for ALL Indirect bars  
const FINAL_COLOR = "#f59e0b";     // Orange for ALL Final bars

const getLevel = (value: number): number => {
  if (value >= 75) return 3;
  if (value >= 60) return 2;
  if (value >= 50) return 1;
  return 0;
};

const getLevelLabel = (level: number): string => {
  switch (level) {
    case 3: return "Excellent";
    case 2: return "Good";
    case 1: return "Moderate";
    default: return "Not Attained";
  }
};

const AnalyticsPage: React.FC = () => {
  const { subjects } = useSubjects();
  const [selectedSubject, setSelectedSubject] = useState("");
  const [coData, setCoData] = useState<COAttainment[]>([]);
  const [poData, setPoData] = useState<POAttainment[]>([]);
  const [matrixData, setMatrixData] = useState<number[][]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const subject = subjects.find(s => s.id === selectedSubject);

  useEffect(() => {
    setCoData([]);
    setPoData([]);
    setMatrixData([]);
    setIsLoading(false);
  }, [selectedSubject]);

  useEffect(() => {
    if (!selectedSubject) return;

    setIsLoading(true);
    
    const fetchSubjectData = async () => {
      try {
        console.log(`📡 Fetching analytics for ${selectedSubject}...`);
        
        const [directRes, indirectRes, matrixRes] = await Promise.all([
          fetch(`${API_URL}/analytics/direct-summary/${selectedSubject}`),
          fetch(`${API_URL}/analytics/indirect-summary/${selectedSubject}`),
          fetch(`${API_URL}/analytics/copo-pso-matrix/${selectedSubject}`)
        ]);

        if (!directRes.ok || !indirectRes.ok || !matrixRes.ok) {
          throw new Error('API endpoints not responding');
        }

        const [directJson, indirectJson, matrixJson] = await Promise.all([
          directRes.json(),
          indirectRes.json(),
          matrixRes.json()
        ]);

        const directArr = directJson.co_attainments || [];
        const indirectArr = indirectJson.co_attainments || [];
        const matrixArr = matrixJson.matrix || [];

        const finalCO: COAttainment[] = directArr.map((d: any, index: number) => {
          const directVal = Number(d.percentage) || 0;
          const indirectVal = Number(indirectArr[index]?.percentage) || 0;
          const finalVal = Number((directVal * 0.8 + indirectVal * 0.2).toFixed(1));
          return { co: `CO${index + 1}`, direct: directVal, indirect: indirectVal, final: finalVal };
        });

        setCoData(finalCO);
        setMatrixData(matrixArr);

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

        setPoData(poResults);
        console.log(`✅ Loaded ${selectedSubject}: ${finalCO.length} COs, ${poResults.length} POs/PSOs`);
      } catch (error) {
        console.error("❌ Analytics Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubjectData();
  }, [selectedSubject]);

  const flippedCOPOData = useMemo<COPOChartRow[]>(() => {
    if (!coData.length || !matrixData.length) return [];
    return PO_LABELS.map((po, poIndex) => {
      const row: any = { po };
      coData.slice(0, 5).forEach((co, coIndex) => {
        const mapping = matrixData[coIndex]?.[poIndex] ?? 0;
        let level = 0;
        if (mapping > 0) {
          level = getLevel(co.final);
        }
        row[co.co] = level;
      });
      return row;
    });
  }, [coData, matrixData]);

  const summary = useMemo(() => {
    const avgCO = coData.length ? Math.round(coData.reduce((s, c) => s + c.final, 0) / coData.length) : 0;
    const coL3 = coData.filter(c => c.final >= 75).length;
    const poL2 = poData.slice(0, 12).filter(p => p.level >= 2).length;
    const psoL2 = poData.slice(12).filter(p => p.level >= 2).length;
    return {
      avgCO,
      coL3,
      poL2,
      psoL2,
      coTotal: coData.length,
      poTotal: 12,
      psoTotal: 3,
      compliance: coL3 >= coData.length * 0.6 && poL2 >= 8 && psoL2 >= 1,
    };
  }, [coData, poData]);

  const radarData = useMemo(() => {
    return poData.map(po => ({
      outcome: po.poNumber,
      value: po.value
    }));
  }, [poData]);

  const downloadPDF = () => {
    if (!subject || !coData.length) return;
    const doc = new jsPDF("landscape");
    let y = 25;
    doc.setFontSize(16);
    doc.text(`${subject.subjectCode} - ${subject.subjectName}`, 14, y);
    y += 25;

    autoTable(doc, {
      startY: y,
      head: [["CO", "Direct %", "Indirect %", "Final %"]],
      body: coData.map(c => [c.co, `${c.direct.toFixed(1)}%`, `${c.indirect.toFixed(1)}%`, `${c.final.toFixed(1)}%`]),
      styles: { fontSize: 10 }
    });

    y = (doc as any).lastAutoTable.finalY + 15;
    autoTable(doc, {
      startY: y,
      head: [["PO/PSO", "Attainment %", "Level"]],
      body: poData.map(p => [p.poNumber, `${p.value.toFixed(1)}%`, `L${p.level}`]),
      styles: { fontSize: 10 }
    });

    doc.save(`${subject.subjectCode}_CO_PSO_Analytics.pdf`);
  };

  const hasData = coData.length > 0 || poData.length > 0 || matrixData.length > 0;

  return (
    <DashboardLayout title="Analytics Dashboard" subtitle="Complete CO → PO/PSO Mapping Analysis">
      <div className="space-y-6 p-4">
        
        {/* 🔘 CONTROLS */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-4 max-w-2xl mx-auto">
          <div className="flex-1 min-w-0">
            <label className="text-sm font-medium block mb-3 text-center lg:text-left">Subject</label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose subject..." />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.subjectCode} — {s.subjectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasData && (
            <div className="flex gap-3 flex-wrap justify-center">
              <Button 
                onClick={downloadPDF} 
                className="gradient-accent text-accent-foreground flex items-center gap-2 text-sm px-6"
                size="sm"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
              
              <Button 
                variant="outline" 
                className="text-sm px-6"
                size="sm"
                onClick={() => setSelectedSubject("")}
              >
                Reset
              </Button>
            </div>
          )}
        </div>

        {/* 📊 RESULTS */}
        <div className="space-y-6 max-w-6xl mx-auto">
          
          {isLoading ? (
            <Card className="glass-card h-[400px] flex items-center justify-center">
              <div className="text-center space-y-4">
                <Loader2 className="w-16 h-16 mx-auto animate-spin text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-muted-foreground">
                    Computing Analytics for {subject?.subjectCode}...
                  </h3>
                  <p className="text-sm text-muted-foreground">CO → PO/PSO mapping analysis (15 outcomes)</p>
                </div>
              </div>
            </Card>
          ) : hasData ? (
            <>
              {/* 1️⃣ FIXED CO CHART - ONE COLOR PER CATEGORY */}
              {coData.length > 0 && (
                <Card className="glass-card">
                  <CardHeader className="pb-4">
                    <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Final CO Attainment (80D+20I) - {subject?.subjectCode}
                    </h3>
                  </CardHeader>
                  <CardContent className="px-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={coData} margin={{ top: 10, right: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="co" tick={{ fontSize: 12, fontWeight: 500 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", borderRadius: 8, fontSize: 13 }} />
                        <Legend />
                        {/* 🔥 FIXED: ONE COLOR FOR ALL Direct bars */}
                        <Bar dataKey="direct" name="Direct" fill={DIRECT_COLOR} radius={[6, 6, 0, 0]} barSize={28} />
                        {/* 🔥 FIXED: ONE COLOR FOR ALL Indirect bars */}
                        <Bar dataKey="indirect" name="Indirect" fill={INDIRECT_COLOR} radius={[6, 6, 0, 0]} barSize={28} />
                        {/* 🔥 FIXED: ONE COLOR FOR ALL Final bars */}
                        <Bar dataKey="final" name="Final" fill={FINAL_COLOR} radius={[8, 8, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* 2️⃣ PO/PSO RADAR CHART (15 Outcomes) */}
              {radarData.length > 0 && (
                <Card className="glass-card">
                  <CardHeader className="pb-4">
                    <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                      <Target className="w-4 h-4" />
                      PO / PSO Attainment Radar (15 Outcomes) - {subject?.subjectCode}
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={450}>
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius={170}
                        data={radarData}
                      >
                        <PolarGrid />
                        <PolarAngleAxis
                          dataKey="outcome"
                          tick={{ fontSize: 11, fontWeight: 600 }}
                        />
                        <PolarRadiusAxis
                          domain={[0, 100]}
                          tickCount={6}
                        />
                        <Tooltip />
                        <Radar
                          name="Attainment %"
                          dataKey="value"
                          stroke="#2563eb"
                          fill="#2563eb"
                          fillOpacity={0.45}
                        />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* 3️⃣ FLIPPED PO→CO MAPPING CHART - HORIZONTAL PO LABELS */}
              {flippedCOPOData.length > 0 && (
                <Card className="glass-card">
                  <CardHeader className="pb-4">
                    <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      PO/PSO → CO Mapping Levels (15 Outcomes) - {subject?.subjectCode}
                    </h3>
                  </CardHeader>
                  <CardContent className="px-4">
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={flippedCOPOData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        {/* 🔥 FIXED: HORIZONTAL PO LABELS */}
                        <XAxis dataKey="po" tick={{ fontSize: 11, fontWeight: 500 }} interval={0} height={60} stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={[0, 3]} ticks={[0,1,2,3]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", borderRadius: 8, fontSize: 13 }} />
                        <Legend />
                        {coData.slice(0, 5).map((co, index) => (
                          <Bar 
                            key={co.co} 
                            dataKey={co.co} 
                            name={co.co} 
                            fill={['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'][index]} 
                            barSize={22} 
                            radius={[6, 6, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* 4️⃣ MAPPING MATRIX - FULL PO+PSO */}
              {matrixData.length > 0 && (
                <Card className="glass-card">
                  <CardHeader className="pb-4">
                    <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                      <Table className="w-4 h-4" />
                      CO → PO/PSO Mapping Matrix (15 Outcomes) - {subject?.subjectCode}
                    </h3>
                  </CardHeader>
                  <CardContent className="overflow-x-auto px-4">
                    <div className="min-w-[1400px] mx-auto max-w-full">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-center p-3 font-semibold w-32">CO (Final %)</th>
                            {PO_LABELS.map(po => (
                              <th key={po} className="text-center p-2 font-semibold w-12">
                                {po} {/* 🔥 HORIZONTAL TEXT */}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {matrixData.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-b hover:bg-muted/50">
                              <td className="p-3 font-semibold text-center">
                                CO{i + 1}<br/>
                                <span className="text-muted-foreground">{coData[i]?.final?.toFixed(1)}%</span>
                              </td>
                              {row.slice(0, 15).map((val, j) => (
                                <td key={j} className={`text-center p-2 font-bold w-12 text-sm ${
                                  val === 3 ? 'text-green-600 font-bold' :
                                  val === 2 ? 'text-yellow-600 font-semibold' :
                                  val === 1 ? 'text-orange-600' :
                                  'text-muted-foreground'
                                }`}>
                                  {val}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 5️⃣ EXECUTIVE SUMMARY */}
              <Card className="glass-card">
                <CardHeader className="pb-4">
                  <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                    <Award className="w-4 h-4" />
                    Executive Summary (PO + PSO) - {subject?.subjectCode}
                  </h3>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 text-center">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-foreground">{summary.avgCO}%</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Avg CO</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-foreground">{summary.coL3}/{summary.coTotal}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">COs ≥ L3</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-foreground">{summary.poL2}/{summary.poTotal}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">POs ≥ L2</div>
                  </div>
                  <div className="space-y-1">
                    <div className={`text-xl font-bold px-4 py-2 rounded-lg w-full mx-auto ${
                      summary.compliance 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                    }`}>
                      {summary.compliance ? 'PASS' : 'REVIEW'}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">NBA Compliance</div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : selectedSubject ? (
            <Card className="glass-card h-[400px] flex items-center justify-center">
              <div className="text-center space-y-4">
                <Target className="w-16 h-16 mx-auto opacity-30 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-muted-foreground">No Analytics Data</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Complete Direct → Indirect → CO-PO-PSO Mapping first for {subject?.subjectCode}
                  </p>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;

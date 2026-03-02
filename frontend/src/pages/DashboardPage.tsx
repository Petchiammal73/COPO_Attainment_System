import React, { useEffect, useState, useCallback } from "react";
import { useSubjects } from "@/context/SubjectContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { 
  BookOpen, 
  TrendingUp, 
  Target, 
  BarChart3, 
  Award, 
  ChevronRight,
  Activity,
  FileText,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = "http://localhost:8000";

interface DashboardSummary {
  avgCO: number;
  coL3Count: number;
  coTotal: number;
  poL2Count: number;
  poTotal: number;
  psoL2Count: number;
  psoTotal: number;
  compliance: boolean;
  po1_6_avg?: number;
  po7_12_avg?: number;
}

const DashboardPage: React.FC = () => {
  const { subjects } = useSubjects();
  const { toast } = useToast();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 🔥 Fetch analytics summary from backend
  const fetchSummary = useCallback(async (subjectId: string) => {
    if (!subjectId) return;
    
    try {
      setIsLoading(true);
      
      const [directRes, indirectRes, matrixRes] = await Promise.all([
        fetch(`${API_URL}/analytics/direct-summary/${subjectId}`).catch(() => null),
        fetch(`${API_URL}/analytics/indirect-summary/${subjectId}`).catch(() => null),
        fetch(`${API_URL}/analytics/copo-pso-matrix/${subjectId}`).catch(() => null),
      ]);

      if (!directRes?.ok || !indirectRes?.ok || !matrixRes?.ok) {
        setSummary(null);
        return;
      }

      const directData = await directRes.json();
      const indirectData = await indirectRes.json();
      const matrixData = await matrixRes.json();

      const finalCOs = directData.co_attainments.map((co: any, idx: number) => {
        const indirectPercent = indirectData.co_attainments[idx]?.percentage || 0;
        return Number((co.percentage * 0.8 + indirectPercent * 0.2).toFixed(1));
      });

      const PO_LABELS = ["PO1", "PO2", "PO3", "PO4", "PO5", "PO6", "PO7", "PO8", "PO9", "PO10", "PO11", "PO12", "PSO1", "PSO2", "PSO3"];
      const poAttainments = PO_LABELS.map((_, poIndex) => {
        let numerator = 0, denominator = 0;
        finalCOs.forEach((coValue: number, coIndex: number) => {
          const mapping = matrixData.matrix[coIndex]?.[poIndex] || 0;
          if (mapping > 0) {
            numerator += coValue * mapping;
            denominator += mapping;
          }
        });
        return denominator > 0 ? Number((numerator / denominator).toFixed(1)) : 0;
      });

      const avgCO = Number(finalCOs.reduce((sum, val) => sum + val, 0) / finalCOs.length || 0).toFixed(1);
      const coL3Count = finalCOs.filter((val: number) => val >= 75).length;
      const coTotal = finalCOs.length;
      const poL2Count = poAttainments.slice(0, 12).filter((val: number) => val >= 60).length;
      const poTotal = 12;
      const psoL2Count = poAttainments.slice(12).filter((val: number) => val >= 60).length;
      const psoTotal = 3;
      const po1_6_avg = Number(poAttainments.slice(0, 6).reduce((sum, val) => sum + val, 0) / 6 || 0).toFixed(1);
      const po7_12_avg = Number(poAttainments.slice(6, 12).reduce((sum, val) => sum + val, 0) / 6 || 0).toFixed(1);

      const compliance = coL3Count >= coTotal * 0.6 && poL2Count >= 8 && psoL2Count >= 1;

      setSummary({
        avgCO: Number(avgCO),
        coL3Count,
        coTotal,
        poL2Count,
        poTotal,
        psoL2Count,
        psoTotal,
        compliance,
        po1_6_avg: Number(po1_6_avg),
        po7_12_avg: Number(po7_12_avg),
      });
    } catch (error) {
      console.error("Dashboard summary error:", error);
      setSummary(null);
      toast({
        title: "⚠️ Analytics data not ready",
        description: "Complete Direct → Indirect → CO-PO mapping first",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const lastSubject = localStorage.getItem('lastAnalyzedSubject');
    const validLastSubject = lastSubject && subjects.find(s => s.id === lastSubject);
    
    if (validLastSubject) {
      setSelectedSubject(lastSubject);
      fetchSummary(lastSubject);
    } else if (subjects[0]) {
      setSelectedSubject(subjects[0].id);
      fetchSummary(subjects[0].id);
    }
  }, [subjects, fetchSummary]);

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId);
    localStorage.setItem('lastAnalyzedSubject', subjectId);
    fetchSummary(subjectId);
  };

  const subject = subjects.find(s => s.id === selectedSubject);

  return (
    <DashboardLayout title="Dashboard" subtitle="Course Outcome Analytics">
      <div className="space-y-6">
        {/* 🔥 Header Row - Enhanced with subtle gradients */}
        <div className="flex flex-col lg:flex-row gap-6 bg-gradient-to-r from-slate-50/50 to-blue-50/30 rounded-2xl p-6 border border-border/30">
          {/* Subject Selector */}
          <div className="flex-1 lg:w-1/3">
            <Card className="glass-card border-0 shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-t-lg">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Subject Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Select value={selectedSubject} onValueChange={handleSubjectChange}>
                  <SelectTrigger className="h-11 border-blue-200 hover:border-blue-300 focus:border-blue-400 transition-colors">
                    <SelectValue placeholder="Select subject..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id} className="text-xs">
                        {subject.subjectCode} - {subject.subjectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats - Colorful icons + subtle backgrounds */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
            <Card className={`glass-card border-0 shadow-sm hover:shadow-lg transition-all ${isLoading ? 'opacity-60' : ''}`}>
              <CardContent className="p-6 bg-gradient-to-br from-blue-50/50 to-blue-100/30">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-3 shadow-md">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                {isLoading ? (
                  <div className="flex items-center justify-center h-16">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground mb-1">{summary?.avgCO?.toFixed(1) || '0'}%</div>
                    <div className="text-xs font-medium text-muted-foreground">Avg CO Attainment</div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className={`glass-card border-0 shadow-sm hover:shadow-lg transition-all ${isLoading ? 'opacity-60' : ''}`}>
              <CardContent className="p-6 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-3 shadow-md">
                  <Target className="w-6 h-6 text-white" />
                </div>
                {isLoading ? (
                  <div className="flex items-center justify-center h-16">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground mb-1">{summary ? `${summary.coL3Count}/${summary.coTotal}` : '0/0'}</div>
                    <div className="text-xs font-medium text-muted-foreground">COs ≥ L3</div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className={`glass-card border-0 shadow-sm hover:shadow-lg transition-all ${isLoading ? 'opacity-60' : ''}`}>
              <CardContent className="p-6 bg-gradient-to-br from-amber-50/50 to-orange-100/30">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mb-3 shadow-md">
                  <Award className="w-6 h-6 text-white" />
                </div>
                {isLoading ? (
                  <div className="flex items-center justify-center h-16">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Badge 
                      variant={summary?.compliance ? "default" : "secondary"} 
                      className={`text-xs px-3 py-1 h-8 w-fit shadow-sm font-semibold ${
                        summary?.compliance 
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      {summary?.compliance ? 'PASS' : 'REVIEW'}
                    </Badge>
                    <div className="text-xs font-medium text-muted-foreground">NBA Compliance</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PO Attainment */}
          <Card className="glass-card border-0 shadow-sm hover:shadow-lg transition-all">
            <CardHeader className="pb-4 bg-gradient-to-r from-slate-50/70 to-blue-50/50 border-b border-blue-100/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Target className="w-4 h-4 text-blue-600" />
                PO Attainment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-gradient-to-r from-slate-50/50 to-blue-50/30">
                    <TableHead className="text-xs font-semibold text-foreground/90">PO Group</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground/90">Attainment</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground/90 w-16">Level</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground/90 w-20">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary ? (
                    <>
                      <TableRow className="hover:bg-emerald-50/30 border-b border-emerald-100/30">
                        <TableCell className="font-medium text-xs text-foreground">PO1-PO6</TableCell>
                        <TableCell className="text-xs font-mono text-emerald-700 font-semibold">{summary.po1_6_avg || 'N/A'}%</TableCell>
                        <TableCell className="text-xs font-mono">L2</TableCell>
                        <TableCell>
                          <Badge 
                            variant="default" 
                            className={`text-xs h-5 px-2.5 shadow-sm ${
                              summary.poL2Count >= 6 
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200' 
                                : 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200'
                            }`}
                          >
                            {summary.poL2Count >= 6 ? 'Met' : 'Review'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-purple-50/30 border-b border-purple-100/30">
                        <TableCell className="font-medium text-xs text-foreground">PO7-PO12</TableCell>
                        <TableCell className="text-xs font-mono text-purple-700 font-semibold">{summary.po7_12_avg || 'N/A'}%</TableCell>
                        <TableCell className="text-xs font-mono">L2</TableCell>
                        <TableCell>
                          <Badge 
                            variant="default" 
                            className={`text-xs h-5 px-2.5 shadow-sm ${
                              summary.poL2Count >= 12 
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200' 
                                : 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200'
                            }`}
                          >
                            {summary.poL2Count >= 12 ? 'Met' : 'Review'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-12">
                        {isLoading ? 'Loading analytics...' : 'Complete CO → PO mapping for detailed results'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="glass-card border-0 shadow-sm hover:shadow-lg transition-all">
            <CardHeader className="pb-4 bg-gradient-to-r from-slate-50/70 to-indigo-50/50 border-b border-indigo-100/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Activity className="w-4 h-4 text-indigo-600" />
                Recent Subjects
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {subjects.slice(0, 4).map(subject => (
                  <div key={subject.id} className="p-4 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all border-l-4 border-l-blue-200/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs text-foreground truncate">
                          {subject.subjectCode}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {subject.subjectName}
                        </div>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground whitespace-nowrap bg-blue-100/50 px-2 py-0.5 rounded-full">
                        Sem {subject.semester}
                      </div>
                    </div>
                  </div>
                ))}
                {subjects.length === 0 && (
                  <div className="p-12 text-center text-xs text-muted-foreground">
                    No subjects configured
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards - Enhanced with subtle icons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { to: "/subjects", icon: BookOpen, title: "Total Subjects", count: subjects.length, desc: "Manage Subjects", color: "from-blue-500 to-indigo-600" },
            { to: "/direct-attainment", icon: TrendingUp, title: "COs Completed", count: summary?.coTotal || 0, desc: "Enter Direct Marks", color: "from-emerald-500 to-teal-600" },
            { to: "/co-po-mapping", icon: Target, title: "POs Mapped", count: summary?.poL2Count || 0, desc: "CO → PO Mapping", color: "from-purple-500 to-pink-600" },
            { to: "/analytics", icon: BarChart3, title: "NBA Status", count: summary?.compliance ? '✓ PASS' : '⚠ REVIEW', desc: "Full Analytics", color: "from-amber-500 to-orange-600" }
          ].map(({ to, icon: Icon, title, count, desc, color }, index) => (
            <Card key={to} className="glass-card border-0 shadow-sm hover:shadow-xl transition-all group cursor-pointer overflow-hidden">
              <CardContent className="p-6 relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                <Link to={to} className="relative block">
                  <div className={`w-14 h-14 ${color} bg-gradient-to-br rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-all duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-xl font-bold text-foreground mb-2 group-hover:scale-105 transition-transform">{count}</div>
                  <div className="text-xs text-muted-foreground font-medium mb-3 uppercase tracking-wider">{title}</div>
                  <div className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                    {desc} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* NBA Compliance Summary - Enhanced */}
        {summary && (
          <Card className={`glass-card border-0 shadow-lg ${summary.compliance ? 'ring-2 ring-emerald-200/50' : 'ring-2 ring-orange-200/50'}`}>
            <CardHeader className={`pb-4 ${summary.compliance ? 'bg-gradient-to-r from-emerald-50/70 to-emerald-100/50' : 'bg-gradient-to-r from-orange-50/70 to-orange-100/50'} border-b border-emerald-100/30`}>
              <CardTitle className="flex items-center justify-between text-sm font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  NBA Criterion 3.2.2 Compliance
                </span>
                <Badge 
                  variant={summary.compliance ? "default" : "destructive"} 
                  className={`text-sm px-4 py-2 h-9 font-bold shadow-md ${
                    summary.compliance 
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  {summary.compliance ? 'Compliant' : 'Non-Compliant'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-8">
                <div className="space-y-1 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{summary.avgCO.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Avg CO Attainment</div>
                </div>
                <div className="space-y-1 text-center">
                  <div className="text-2xl font-bold text-blue-600">{summary.coL3Count}/{summary.coTotal}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">COs ≥ L3 (75%)</div>
                </div>
                <div className="space-y-1 text-center">
                  <div className="text-2xl font-bold text-purple-600">{summary.poL2Count}/{summary.poTotal}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">POs ≥ L2 (60%)</div>
                </div>
                <div className="space-y-1 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{summary.psoL2Count}/{summary.psoTotal}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">PSOs ≥ L2</div>
                </div>
              </div>
              <div className="p-8 pt-0 border-t bg-gradient-to-r from-slate-50/50 to-blue-50/30">
                <Button asChild size="sm" className="w-full sm:w-auto h-10 text-sm bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg">
                  <Link to="/analytics">View Detailed Analytics Report</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;

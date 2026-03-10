import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useSubjects } from "@/context/SubjectContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, Download, Loader2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const API_URL = "http://localhost:8000";

const LEVEL_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e"];

interface FinalCOAttainment {
  coNumber: number;
  directPercentage: number;
  indirectPercentage: number;
  finalPercentage: number;
  finalLevel: number;
}

const FinalCOAttainmentPage: React.FC = () => {
  const { subjects } = useSubjects();
  const { toast } = useToast();
  
  const [selectedSubject, setSelectedSubject] = useState("");
  const [finalResults, setFinalResults] = useState<FinalCOAttainment[] | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  
  // 🔥 DATABASE DATA - Matches your schema.py
  const [directCoAttainments, setDirectCoAttainments] = useState<any[]>([]);
  const [indirectCoAttainments, setIndirectCoAttainments] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const subject = subjects.find((s) => s.id === Number(selectedSubject));

  // 🔥 LOAD FROM DATABASE when subject changes
  useEffect(() => {
    if (!selectedSubject) {
      setDirectCoAttainments([]);
      setIndirectCoAttainments([]);
      setFinalResults(null);
      return;
    }

    const loadAnalyticsData = async () => {
      setIsLoadingData(true);
      try {
        const token = localStorage.getItem('token');
        
        console.log(`🔍 Loading analytics for ${selectedSubject}`);
        
        const [directRes, indirectRes] = await Promise.all([
          fetch(`${API_URL}/analytics/direct-summary/${selectedSubject}`, {
            headers: { ...(token && { Authorization: `Bearer ${token}` }) }
          }).then(r => r.ok ? r.json() : null),
          fetch(`${API_URL}/analytics/indirect-summary/${selectedSubject}`, {
            headers: { ...(token && { Authorization: `Bearer ${token}` }) }
          }).then(r => r.ok ? r.json() : null)
        ]);

        console.log('Direct:', directRes);
        console.log('Indirect:', indirectRes);

        // ✅ Parse your schema.py response format
        setDirectCoAttainments(directRes?.co_attainments || []);
        setIndirectCoAttainments(indirectRes?.co_attainments || []);

        if (!directRes?.co_attainments?.length || !indirectRes?.co_attainments?.length) {
          toast({
            title: "ℹ️ Run Analysis First",
            description: "Complete Direct & Indirect analysis for this subject"
          });
        }

      } catch (error) {
        console.error('Load failed:', error);
        toast({
          title: "❌ No Analytics Data",
          description: "Run Direct & Indirect analysis first",
          variant: "destructive"
        });
        setDirectCoAttainments([]);
        setIndirectCoAttainments([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadAnalyticsData();
  }, [selectedSubject]);

  const computeFinalAttainment = async () => {
    if (!directCoAttainments.length || !indirectCoAttainments.length) {
      toast({ title: "❌ Missing analytics data", variant: "destructive" });
      return;
    }

    setIsComputing(true);
    
    try {
      const finalResults: FinalCOAttainment[] = [];

      // ✅ Extract percentages from your schema format
      const directPercentages = directCoAttainments.map(item => item.percentage);
      const indirectPercentages = indirectCoAttainments.map(item => item.percentage);

      for (let coIdx = 0; coIdx < 5; coIdx++) {
        const directPercent = directPercentages[coIdx] || 0;
        const indirectPercent = indirectPercentages[coIdx] || 0;
        
        const finalPercentage = (directPercent * 0.8) + (indirectPercent * 0.2);
        const finalLevel = Math.min(3, Math.floor(finalPercentage / 25));

        finalResults.push({
          coNumber: coIdx + 1,
          directPercentage: directPercent,
          indirectPercentage: indirectPercent,
          finalPercentage: Math.round(finalPercentage * 10) / 10,
          finalLevel
        });
      }

      setFinalResults(finalResults);
      
      toast({
        title: "✅ Professor's Formula Applied!",
        description: `CO1: ${finalResults[0].indirectPercentage}% Indirect → ${finalResults[0].finalPercentage}% Final`
      });
    } catch (error) {
      toast({ title: "❌ Calculation failed", variant: "destructive" });
    } finally {
      setIsComputing(false);
    }
  };

  const downloadCSV = () => {
    if (!finalResults?.length) return;

    const csv = [
      ["CO", "Direct ≥60%", "Indirect ≥60%", "Final CO (80D+20I)", "Level"],
      ...finalResults.map(r => [
        `CO${r.coNumber}`,
        `${r.directPercentage}%`,
        `${r.indirectPercentage}%`,
        `${r.finalPercentage}%`,
        `L${r.finalLevel}`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `final_co_${subject?.subjectCode || 'subject'}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "✅ CSV Downloaded!" });
  };

  const reset = () => {
    setFinalResults(null);
    setIsComputing(false);
    toast({ title: "🔄 Reset" });
  };

  return (
    <DashboardLayout title="Final CO Attainment" subtitle="80% Direct + 20% Indirect">
      <div className="space-y-8">
        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-8">
              <div className="space-y-6">
                <div>
                  <Label className="text-lg font-semibold mb-3 block">Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.subjectCode} - {s.subjectName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 🔥 DATA STATUS - Shows why button is enabled/disabled */}
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    {isLoadingData ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4" />
                    )}
                    <span>Analytics Status</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div>Direct: {directCoAttainments.length}/5 COs {directCoAttainments.length ? '✅' : '❌'}</div>
                    <div>Indirect: {indirectCoAttainments.length}/5 COs {indirectCoAttainments.length ? '✅' : '❌'}</div>
                  </div>
                </div>

                <Button 
                  onClick={computeFinalAttainment}
                  className="w-full h-14 text-lg font-semibold"
                  disabled={!directCoAttainments.length || !indirectCoAttainments.length || isComputing || isLoadingData}
                  size="lg"
                >
                  {isComputing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Calculate Final COs
                    </>
                  )}
                </Button>

                {finalResults && (
                  <Button 
                    onClick={downloadCSV}
                    className="w-full h-14 bg-green-600 hover:bg-green-700 text-lg font-semibold"
                    size="lg"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download CSV
                  </Button>
                )}

                <Button 
                  onClick={reset}
                  variant="outline"
                  className="w-full h-12"
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {finalResults && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold">Summary</h3>
                <div className="space-y-3">
                  {finalResults.map(r => (
                    <div key={r.coNumber} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span>CO{r.coNumber}</span>
                      <div className="text-right">
                        <div className="font-bold">{r.finalPercentage}%</div>
                        <div className={`text-xs px-2 py-1 rounded-full ${r.finalLevel >= 2 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                          L{r.finalLevel}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results */}
        {finalResults && (
          <Card>
            <CardContent className="p-8 space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{subject?.subjectCode}</h2>
                  <p className="text-muted-foreground">Final CO Attainment (80D + 20I)</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {finalResults.length} COs • Database
                </div>
              </div>

              {/* Results Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-4 font-semibold">CO</th>
                      <th className="text-right py-4 font-semibold">Direct ≥60%</th>
                      <th className="text-right py-4 font-semibold">Indirect ≥60%</th>
                      <th className="text-right py-4 font-semibold">Final CO</th>
                      <th className="text-right py-4 font-semibold">Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalResults.map((r) => (
                      <tr key={r.coNumber} className="border-b last:border-b-0 hover:bg-muted/50">
                        <td className="py-4 font-medium">CO{r.coNumber}</td>
                        <td className="text-right py-4 font-mono">{r.directPercentage}%</td>
                        <td className="text-right py-4 font-mono">{r.indirectPercentage}%</td>
                        <td className="text-right py-4">
                          <span className="text-xl font-bold text-primary">{r.finalPercentage}%</span>
                        </td>
                        <td className="text-right py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            r.finalLevel === 3 ? 'bg-green-100 text-green-800' : 
                            r.finalLevel === 2 ? 'bg-yellow-100 text-yellow-800' : 
                            r.finalLevel === 1 ? 'bg-orange-100 text-orange-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            L{r.finalLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Chart */}
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={finalResults.map(r => ({
                    co: `CO${r.coNumber}`,
                    direct: r.directPercentage,
                    indirect: r.indirectPercentage,
                    final: r.finalPercentage
                  }))}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="co" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="direct" name="Direct (80%)" fill="#3b82f6" />
                  <Bar dataKey="indirect" name="Indirect (20%)" fill="#10b981" />
                  <Bar dataKey="final" name="Final CO" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FinalCOAttainmentPage;

import React, { useState, useCallback, useContext, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useSubjects } from "@/context/SubjectContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, Download, Loader2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

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

  const subject = subjects.find((s) => s.id === selectedSubject);

  // 🔥 USE EXISTING DIRECT/INDIRECT DATA FROM PREVIOUS PAGES
  const [directStudentData, setDirectStudentData] = useState<any[]>([]);
  const [indirectStudentData, setIndirectStudentData] = useState<any[]>([]);

  useEffect(() => {
    try {
      const direct = localStorage.getItem('directStudentData');
      const indirect = localStorage.getItem('indirectStudentData');
      
      if (direct) {
        setDirectStudentData(JSON.parse(direct));
      }
      if (indirect) {
        setIndirectStudentData(JSON.parse(indirect));
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  }, []);

  const computeFinalAttainment = async () => {
    setIsComputing(true);
    
    try {
      // 🔥 DYNAMICALLY load summaries OR calculate from raw data
      let directSummary = localStorage.getItem('directSummary');
      let indirectSummary = localStorage.getItem('indirectSummary');
      
      let directData = [], indirectData = [];
      
      // If summaries exist, use them (Professor's method)
      if (directSummary && indirectSummary) {
        directData = JSON.parse(directSummary);
        indirectData = JSON.parse(indirectSummary);
        console.log('✅ Using SUMMARY data');
      } 
      // Fallback: Calculate from raw student data
      else {
        directData = calculateSummaryFromRaw(directStudentData, 'direct');
        indirectData = calculateSummaryFromRaw(indirectStudentData, 'indirect');
        console.log('✅ Using RAW data calculation');
      }
      
      const finalResults: FinalCOAttainment[] = [];

      for (let coIdx = 0; coIdx < 5; coIdx++) {
        const directPercent = directData[coIdx]?.percentage || 0;
        const indirectPercent = indirectData[coIdx]?.percentage || 0;
        
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
      localStorage.setItem("finalSummary", JSON.stringify(finalResults));
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

  // 🔥 Helper function to calculate summary from raw data
  const calculateSummaryFromRaw = (studentData: any[], type: string) => {
    const coCount = 5;
    const totalStudents = studentData.length;
    const summaries = [];
    
    for (let coIdx = 0; coIdx < coCount; coIdx++) {
      let above60Count = 0;
      
      for (let studentIdx = 0; studentIdx < totalStudents; studentIdx++) {
        let score = 0;
        
        if (type === 'direct') {
          score = studentData[studentIdx][`co${coIdx + 1}`] || 0;
        } else {
          score = studentData[studentIdx]?.scores?.[coIdx] || 0;
        }
        
        if (score >= 60) above60Count++;
      }
      
      const percentage = Math.round((above60Count / totalStudents) * 100 * 10) / 10;
      summaries.push({ percentage });
    }
    
    return summaries;
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
                        <SelectItem key={s.id} value={s.id}>
                          {s.subjectCode} - {s.subjectName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                

                  <Button 
                    onClick={computeFinalAttainment}
                    className="w-full h-14 text-lg font-semibold"
                    disabled={!directStudentData.length || !indirectStudentData.length || isComputing}
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
                  {finalResults.length} COs • {directStudentData.length} Students
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

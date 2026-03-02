// StudentPredictionPage.tsx - NEW PAGE
import React, { useState, useMemo } from "react";
import { read, utils } from 'xlsx';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, ChartLine, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from "recharts";
import { useToast } from "@/hooks/use-toast";

interface StudentData {
  rollNo: string;
  name: string;
  internal1: number;
  internal2: number;
  finalExam: number;
  total?: number;
}

interface PredictionResult {
  rollNo: string;
  name: string;
  predicted: number;
  actual: number;
  error: number;
  errorPercent: number;
  status: 'accurate' | 'moderate' | 'poor';
}

const StudentPredictionPage: React.FC = () => {
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [studentData, setStudentData] = useState<StudentData[]>([]);
  const [predictionResults, setPredictionResults] = useState<PredictionResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Simple ML-like prediction model (weighted average + trend)
  const predictFinalScore = (internal1: number, internal2: number): number => {
    // Prediction formula: 0.3*internal1 + 0.4*internal2 + trend_factor
    const trend = internal2 > internal1 ? 5 : internal2 < internal1 ? -3 : 0;
    return Math.min(100, Math.max(0, (internal1 * 0.3 + internal2 * 0.4 + trend) * 1.25));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData: any[] = utils.sheet_to_json(worksheet);
        
        // Expected columns: Roll No, Name, Internal 1, Internal 2, Final Exam
        const processedData: StudentData[] = jsonData.map((row, index) => ({
          rollNo: row['Roll No'] || row['rollno'] || row['RollNo'] || `S${index + 1}`,
          name: row['Name'] || row['Student Name'] || 'Unknown',
          internal1: parseFloat(row['Internal 1']?.toString()) || 0,
          internal2: parseFloat(row['Internal 2']?.toString()) || 0,
          finalExam: parseFloat(row['Final Exam']?.toString()) || 0,
          total: parseFloat(row['Total']?.toString()) || 0
        })).filter(student => student.internal1 > 0 || student.internal2 > 0);

        setStudentData(processedData);
        toast({
          title: "Success",
          description: `${processedData.length} students loaded successfully!`
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Invalid Excel file format. Expected columns: Roll No, Name, Internal 1, Internal 2, Final Exam",
          variant: "destructive"
        });
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  const analyzePredictions = () => {
    if (studentData.length === 0) {
      toast({
        title: "No Data",
        description: "Please upload student marks data first",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    
    const results: PredictionResult[] = studentData.map(student => {
      const predicted = predictFinalScore(student.internal1, student.internal2);
      const actual = student.finalExam;
      const error = Math.abs(predicted - actual);
      const errorPercent = ((error / actual) * 100) || 0;
      
      let status: PredictionResult['status'];
      if (error <= 5) status = 'accurate';
      else if (error <= 15) status = 'moderate';
      else status = 'poor';

      return {
        rollNo: student.rollNo,
        name: student.name,
        predicted: Number(predicted.toFixed(1)),
        actual: actual,
        error: Number(error.toFixed(1)),
        errorPercent: Number(errorPercent.toFixed(1)),
        status
      };
    });

    setPredictionResults(results);
    setIsAnalyzing(false);

    toast({
      title: "Analysis Complete",
      description: `Prediction accuracy: ${calculateOverallAccuracy(results).toFixed(1)}%`
    });
  };

  const calculateOverallAccuracy = (results: PredictionResult[]) => {
    const meanAbsoluteError = results.reduce((sum, r) => sum + r.error, 0) / results.length;
    return Math.max(0, 100 - (meanAbsoluteError * 2)); // Simplified accuracy metric
  };

  const chartData = useMemo(() => {
    if (!predictionResults.length) return [];
    
    return predictionResults.map((result, index) => ({
      index: index + 1,
      student: result.rollNo,
      predicted: result.predicted,
      actual: result.actual,
      error: result.error
    }));
  }, [predictionResults]);

  const statusCounts = useMemo(() => {
    const counts = { accurate: 0, moderate: 0, poor: 0 };
    predictionResults.forEach(r => counts[r.status]++);
    return counts;
  }, [predictionResults]);

  const downloadAnalysisReport = () => {
    const report = [
      "STUDENT PERFORMANCE PREDICTION ANALYSIS",
      `Generated: ${new Date().toLocaleDateString()}`,
      "",
      `Total Students: ${predictionResults.length}`,
      `Prediction Accuracy: ${calculateOverallAccuracy(predictionResults).toFixed(1)}%`,
      `Status Breakdown:`,
      `  Accurate (±5 marks): ${statusCounts.accurate}`,
      `  Moderate (±15 marks): ${statusCounts.moderate}`, 
      `  Poor (>15 marks): ${statusCounts.poor}`,
      "",
      "STUDENT-WISE ANALYSIS:",
      ...predictionResults.map(r => 
        `${r.rollNo} (${r.name}): Predicted=${r.predicted}, Actual=${r.actual}, Error=${r.error}(${r.errorPercent}%) [${r.status.toUpperCase()}]`
      )
    ].join('\n');

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Student_Prediction_Analysis.txt';
    a.click();
  };

  return (
    <DashboardLayout title="Student Performance Prediction" subtitle="Predict Final Exam Scores from Internal Marks">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Upload Section */}
        <div className="max-w-2xl mx-auto">
          <Card className="border shadow-md">
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ChartLine className="w-5 h-5" />
                Upload University Marks Data (Excel/CSV)
              </h2>
              <p className="text-sm text-muted-foreground">
                Expected columns: Roll No, Name, Internal 1 (%), Internal 2 (%), Final Exam (%)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 border-2 border-dashed border-muted rounded-lg">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <div>
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="w-64"
                  />
                  {file && (
                    <p className="text-sm text-muted-foreground mt-1">{file.name}</p>
                  )}
                </div>
              </div>
              
              {studentData.length > 0 && (
                <div className="flex gap-3">
                  <Button 
                    onClick={analyzePredictions}
                    disabled={isAnalyzing}
                    className="flex-1"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <ChartLine className="w-4 h-4 mr-2" />
                        Run Prediction Analysis
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setStudentData([]);
                      setPredictionResults([]);
                      setFile(null);
                    }}
                  >
                    Clear Data
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {predictionResults.length > 0 && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <Card className="border shadow-sm">
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-mono font-semibold text-primary">{predictionResults.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Students Analyzed</div>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-mono font-semibold text-green-600">{calculateOverallAccuracy(predictionResults).toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">Prediction Accuracy</div>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardContent className="p-6 text-center">
                  <Badge variant="default" className="text-xs">{statusCounts.accurate}</Badge>
                  <div className="text-xs text-muted-foreground mt-1">Accurate Predictions</div>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardContent className="p-6 text-center">
                  <Badge variant="secondary" className="text-xs">{statusCounts.poor}</Badge>
                  <div className="text-xs text-muted-foreground mt-1">Poor Predictions</div>
                </CardContent>
              </Card>
            </div>

            {/* Prediction vs Actual Chart */}
            <Card className="max-w-5xl mx-auto border shadow-lg">
              <CardHeader>
                <h3 className="text-lg font-semibold">Prediction vs Actual Performance</h3>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="student" angle={-45} height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="predicted" stroke="#3b82f6" name="Predicted" />
                    <Line type="monotone" dataKey="actual" stroke="#10b981" name="Actual" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Download & Actions */}
            <div className="max-w-2xl mx-auto text-center">
              <Button onClick={downloadAnalysisReport} className="mr-3">
                <FileText className="w-4 h-4 mr-2" />
                Download Analysis Report
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentPredictionPage;

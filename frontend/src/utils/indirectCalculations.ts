// indirectCalculations.ts (can be placed in the same file or imported)
import Papa from "papaparse";
import { toast } from "@/hooks/use-toast";

export type IndirectAttainment = {
  coNumber: number;
  percentage: number;
  level: number;
  partAAvg: number;
  partBAvg: number;
};

const CO_LEVELS = [
  { min: 80, level: 3 }, // High
  { min: 70, level: 2 }, // Medium
  { min: 60, level: 1 }, // Low
  { min: 0, level: 0 },  // Not Attained
];

export function getAttainmentLevel(percentage: number): number {
  const level = CO_LEVELS.find(l => percentage >= l.min)?.level ?? 0;
  return level;
}

/**
 * Parse CSV safely and convert to numeric marks
 */
export function parseSurveyCSV(file: File, type: "PartA" | "PartB"): Promise<number[][]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (result) => {
        try {
          const rows = result.data as string[][];
          const data = rows
            .slice(1) // remove header
            .filter(row => row.length > 0 && row.some(cell => cell.toString().trim() !== ""))
            .map(row => row.map(cell => {
              let val = parseFloat(cell.toString());
              if (type === "PartA") {
                // Convert 1-5 Likert → 0-100
                val = Math.max(0, Math.min(5, val));
                val = ((val - 1) / 4) * 100; // 1 →0, 5→100
              }
              return isNaN(val) ? 0 : val;
            }));
          resolve(data);
        } catch (err) {
          toast({ title: "Error", description: `Invalid ${type} file`, variant: "destructive" });
          reject(err);
        }
      },
      error: () => reject(new Error("Failed to parse CSV")),
    });
  });
}

/**
 * Compute indirect attainment per CO
 * partA: array of student scores for Part A (numStudents × 25 questions)
 * partB: array of student scores for Part B (numStudents × 5 questions, each column = CO)
 */
export function computeIndirectCO(partA: number[][], partB: number[][]): IndirectAttainment[] {
  const numStudents = Math.min(partA.length, partB.length);
  const numCOs = partB[0]?.length || 5; // default 5 COs

  const results: IndirectAttainment[] = [];

  for (let co = 0; co < numCOs; co++) {
    let partASum = 0;
    let partBSum = 0;

    for (let i = 0; i < numStudents; i++) {
      const studentPartAAvg = partA[i].reduce((a, b) => a + b, 0) / partA[i].length; // mean of 25 Q
      partASum += studentPartAAvg;
      partBSum += partB[i][co] ?? 0; // CO-wise Part B
    }

    const partAAvg = Math.round(partASum / numStudents);
    const partBAvg = Math.round(partBSum / numStudents);
    const percentage = Math.round(0.4 * partAAvg + 0.6 * partBAvg);

    results.push({
      coNumber: co + 1,
      partAAvg,
      partBAvg,
      percentage,
      level: getAttainmentLevel(percentage),
    });
  }

  return results;
}
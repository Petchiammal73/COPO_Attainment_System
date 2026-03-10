// @/utils/directCalculations.ts

import { DirectAttainment } from "@/types";

export type StudentCO = {
  cos: any;
  co1: number;
  co2: number;
  co3: number;
  co4: number;
  co5: number;
};

export type IATThresholds = {
  iat1_co1: number;
  iat1_co2: number;
  iat1_co3_a: number;
  iat1_co3_b: number;
  iat2_co4: number;
  iat2_co5: number;
};

//////////////////////////////////////////////////////
// DEFAULT THRESHOLDS
//////////////////////////////////////////////////////

const defaultThresholds = (): IATThresholds => ({
  iat1_co1: 24,
  iat1_co2: 17,
  iat1_co3_a: 9,
  iat1_co3_b: 9,
  iat2_co4: 24,
  iat2_co5: 17
});

//////////////////////////////////////////////////////
// HEADER DETECTION
//////////////////////////////////////////////////////

export const detectIATThresholds = (headerRow: string[]): IATThresholds => {
  console.log("🔍 RAW HEADER ROW:", headerRow);

  if (!headerRow || headerRow.length < 4) {
    return defaultThresholds();
  }

  // Remove first 3 columns (SNO, REGNO, NAME)
  const cleanedHeaders = headerRow.slice(3).map((h) => {
    const cleaned = h
      ?.toString()
      ?.replace(/[,\s]/g, "")
      ?.replace(/[^\d.]/g, "")
      ?.trim();

    const num = parseFloat(cleaned || "0");
    return isNaN(num) ? 0 : num;
  });

  console.log("🔍 CLEANED HEADERS:", cleanedHeaders);

  // Need 6 columns for CO1..CO5
  if (cleanedHeaders.length < 6) {
    console.warn("⚠ Using default thresholds");
    return defaultThresholds();
  }

  const coHeaders = cleanedHeaders.slice(0, 6);

  console.log("🔍 CO Headers:", coHeaders);

  return {
    iat1_co1: Math.round(coHeaders[0] || 24),
    iat1_co2: Math.round(coHeaders[1] || 17),
    iat1_co3_a: Math.round(coHeaders[2] || 9),
    iat1_co3_b: Math.round(coHeaders[3] || 9),
    iat2_co4: Math.round(coHeaders[4] || 24),
    iat2_co5: Math.round(coHeaders[5] || 17)
  };
};

//////////////////////////////////////////////////////
// STUDENT CO CALCULATION
//////////////////////////////////////////////////////

export const calculateStudentCO = (
  assign: number[],
  internal: number[],
  thresholds: IATThresholds
): StudentCO => {

  const safeAssign = (assign || [])
    .slice(0, 5)
    .concat([0, 0, 0])
    .map((n) => Math.max(0, Number(n) || 0));

  const safeInternal = (internal || [])
    .slice(0, 6)
    .concat([0, 0])
    .map((n) => Math.max(0, Number(n) || 0));

  const co3Total = thresholds.iat1_co3_a + thresholds.iat1_co3_b;

  const scores = {

    co1:
      (safeAssign[0] / 15) * 20 +
      (safeInternal[0] / thresholds.iat1_co1) * 80,

    co2:
      (safeAssign[1] / 10) * 20 +
      (safeInternal[1] / thresholds.iat1_co2) * 80,

    co3:
      (safeAssign[2] / 15) * 20 +
      ((safeInternal[2] + safeInternal[3]) / co3Total) * 80,

    co4:
      (safeAssign[3] / 10) * 20 +
      (safeInternal[4] / thresholds.iat2_co4) * 80,

    co5:
      (safeAssign[4] / 10) * 20 +
      (safeInternal[5] / thresholds.iat2_co5) * 80
  };

  return {
    cos: {},
    co1: Math.min(100, Math.round(scores.co1 * 10) / 10),
    co2: Math.min(100, Math.round(scores.co2 * 10) / 10),
    co3: Math.min(100, Math.round(scores.co3 * 10) / 10),
    co4: Math.min(100, Math.round(scores.co4 * 10) / 10),
    co5: Math.min(100, Math.round(scores.co5 * 10) / 10)
  };
};

//////////////////////////////////////////////////////
// CLASS ATTAINMENT
//////////////////////////////////////////////////////

export const calculateClassAttainment = (
  students: StudentCO[]
): DirectAttainment[] => {

  const total = students.length;

  if (total === 0) {
    return Array(5).fill(null).map((_, i) => ({
      coNumber: (i + 1) as any,
      percentage: 0,
      studentsAboveThreshold: 0,
      totalStudents: 0,
      level: 0
    }));
  }

  const compute = (key: keyof StudentCO, coNumber: number): DirectAttainment => {

    const above60 = students.filter((s) => (s[key] || 0) >= 60).length;

    const percentage = (above60 / total) * 100;

    return {
      coNumber,
      percentage: Math.round(percentage * 10) / 10,
      studentsAboveThreshold: above60,
      totalStudents: total,
      level:
        percentage >= 80
          ? 3
          : percentage >= 70
          ? 2
          : percentage >= 60
          ? 1
          : 0
    };
  };

  return [
    compute("co1", 1),
    compute("co2", 2),
    compute("co3", 3),
    compute("co4", 4),
    compute("co5", 5)
  ];
};
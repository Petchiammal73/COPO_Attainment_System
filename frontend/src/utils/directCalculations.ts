import { DirectAttainment } from "@/types";

export type StudentCO = {
  cos: any;
  co1: number;
  co2: number;
  co3: number;
  co4: number;
  co5: number;
};

export const calculateStudentCO = (
  assign: number[],
  internal: number[]
): StudentCO => {
  return {
    // CO1 → A(15) + IAT1(24)
    co1: (assign[0] / 15) * 20 + (internal[0] / 24) * 80,

    // CO2 → S(10) + IAT1(17)
    co2: (assign[1] / 10) * 20 + (internal[1] / 17) * 80,

    // CO3 → A(15) + IAT1(9) + IAT2(9)
    co3: (assign[2] / 15) * 20 + ((internal[2] + internal[3]) / 18) * 80,

    // CO4 → S(10) + IAT2(24)
    co4: (assign[3] / 10) * 20 + (internal[4] / 24) * 80,

    // CO5 → S(10) + IAT2(17)
    co5: (assign[4] / 10) * 20 + (internal[5] / 17) * 80,
  };
};

export const calculateClassAttainment = (
  students: StudentCO[]
): DirectAttainment[] => {
  const total = students.length;

  const compute = (key: keyof StudentCO, coNumber: number): DirectAttainment => {
    const above60 = students.filter(s => s[key] >= 60).length;
    const percentage = total === 0 ? 0 : (above60 / total) * 100;

    return {
      coNumber,
      percentage: Math.round(percentage),
      studentsAboveThreshold: above60,
      totalStudents: total,
      level:
        percentage >= 80 ? 3 :
        percentage >= 70 ? 2 :
        percentage >= 60 ? 1 : 0,
    };
  };

  return [
    compute("co1", 1),
    compute("co2", 2),
    compute("co3", 3),
    compute("co4", 4),
    compute("co5", 5),
  ];
};
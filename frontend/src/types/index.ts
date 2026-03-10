export interface User {
  id: string;
  facultyCode: string;
  name: string;
  department: string;
  email: string;
  role: "admin" | "faculty";
  status: "active" | "inactive";
}

export interface Subject {
  courseCode: string;
  id: number;
  subjectCode: string;
  subjectName: string;
  academicYear: string;
  semester: number;
  regulation: string;
  courseType: 'theory' | 'lab' | 'theory+lab';
  numberOfCOs: number;
  created_at: string;
}


export interface CODefinition {
  id: string;
  subjectId: string;
  coNumber: number;
  description: string;
}

export interface StudentMarks {
  rollNumber: string;
  name: string;
  marks: number[];
}

export interface DirectAttainment {
  coNumber: number;
  percentage: number;
  level: number;
  studentsAboveThreshold: number;
  totalStudents: number;
}

export interface IndirectAttainment {
  coNumber: number;
  percentage: number;
  level: number;
  partAAvg: number;
  partBAvg: number;
}

export interface FinalCOAttainment {
  coNumber: number;
  directPercentage: number;
  indirectPercentage: number;
  finalPercentage: number;
  finalLevel: number;
}

export interface COPOMapping {
  coNumber: number;
  values: number[]; // PO1-PO12, PSO1-PSO2
}

export interface POAttainment {
  poNumber: string;
  value: number;
  level: number;
}

export type AttainmentLevel = 0 | 1 | 2 | 3;

export function getAttainmentLevel(percentage: number): AttainmentLevel {
  if (percentage >= 80) return 3;
  if (percentage >= 70) return 2;
  if (percentage >= 60) return 1;
  return 0;
}

export function getLevelLabel(level: number): string {
  switch (level) {
    case 3: return "High";
    case 2: return "Medium";
    case 1: return "Low";
    default: return "Not Attained";
  }
}

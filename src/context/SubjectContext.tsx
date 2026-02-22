import React, { createContext, useContext, useState, useCallback } from "react";
import { Subject } from "@/types";

interface SubjectContextType {
  subjects: Subject[];
  addSubject: (s: Omit<Subject, "id" | "createdAt">) => void;
  deleteSubject: (id: string) => void;
  updateSubject: (id: string, s: Partial<Subject>) => void;
  getSubject: (id: string) => Subject | undefined;
}

const SubjectContext = createContext<SubjectContextType | undefined>(undefined);

const DEMO_SUBJECTS: Subject[] = [
  {
    id: "s1",
    subjectCode: "CS301",
    subjectName: "Data Structures & Algorithms",
    academicYear: "2024-25",
    semester: 3,
    regulation: "R2020",
    courseType: "theory",
    numberOfCOs: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: "s2",
    subjectCode: "CS302",
    subjectName: "Database Management Systems",
    academicYear: "2024-25",
    semester: 3,
    regulation: "R2020",
    courseType: "theory+lab",
    numberOfCOs: 6,
    createdAt: new Date().toISOString(),
  },
];

export const SubjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subjects, setSubjects] = useState<Subject[]>(DEMO_SUBJECTS);

  const addSubject = useCallback((s: Omit<Subject, "id" | "createdAt">) => {
    setSubjects((prev) => [
      ...prev,
      { ...s, id: `s${Date.now()}`, createdAt: new Date().toISOString() },
    ]);
  }, []);

  const deleteSubject = useCallback((id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateSubject = useCallback((id: string, updates: Partial<Subject>) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const getSubject = useCallback(
    (id: string) => subjects.find((s) => s.id === id),
    [subjects]
  );

  return (
    <SubjectContext.Provider value={{ subjects, addSubject, deleteSubject, updateSubject, getSubject }}>
      {children}
    </SubjectContext.Provider>
  );
};

export const useSubjects = () => {
  const ctx = useContext(SubjectContext);
  if (!ctx) throw new Error("useSubjects must be used within SubjectProvider");
  return ctx;
};

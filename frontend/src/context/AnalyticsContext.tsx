// context/AnalyticsContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSubjects } from './SubjectContext';

interface AnalyticsSummary {
  avgCO: number;
  coL3Count: number;
  coTotal: number;
  poL2Count: number;
  poTotal: number;
  psoL2Count: number;
  psoTotal: number;
  compliance: boolean;
  selectedSubject: string;
  subjectName?: string;
}

interface AnalyticsContextType {
  summary: AnalyticsSummary | null;
  loading: boolean;
  error: string | null;
  selectSubject: (subjectId: string) => void;
  refresh: () => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export const AnalyticsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { subjects } = useSubjects();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');

  const fetchAnalytics = async (subjectId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const direct = localStorage.getItem("directSummary");
      const indirect = localStorage.getItem("indirectSummary");
      const matrix = localStorage.getItem(`copomatrix_${subjectId}`);

      if (!direct || !indirect || !matrix) {
        throw new Error('Missing analytics data');
      }

      const directArr = JSON.parse(direct);
      const indirectArr = JSON.parse(indirect);
      const matrixArr = JSON.parse(matrix);
      const subject = subjects.find(s => s.id === subjectId);

      // Calculate CO data (same logic as AnalyticsPage)
      const coData = directArr.map((d: any, index: number) => {
        const directVal = Number(d.percentage) || 0;
        const indirectVal = Number(indirectArr[index]?.percentage) || 0;
        const finalVal = Number((directVal * 0.8 + indirectVal * 0.2).toFixed(1));
        return { final: finalVal };
      });

      // Calculate PO/PSO data (simplified for dashboard)
      const avgCO = coData.length ? Math.round(coData.reduce((s, c) => s + c.final, 0) / coData.length) : 0;
      const coL3 = coData.filter((c: any) => c.final >= 75).length;
      
      // Mock PO/PSO calculation (use your full logic here)
      const poL2 = 9; // From your AnalyticsPage calculation
      const psoL2 = 2;
      
      const newSummary: AnalyticsSummary = {
        avgCO,
        coL3Count: coL3,
        coTotal: coData.length,
        poL2Count: poL2,
        poTotal: 12,
        psoL2Count: psoL2,
        psoTotal: 3,
        compliance: coL3 >= coData.length * 0.6 && poL2 >= 8 && psoL2 >= 1,
        selectedSubject: subjectId,
        subjectName: subject?.subjectName,
      };

      setSummary(newSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analytics calculation failed');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const selectSubject = (subjectId: string) => {
    setSelectedSubject(subjectId);
    if (subjectId) fetchAnalytics(subjectId);
    else setSummary(null);
  };

  const refresh = () => selectedSubject && fetchAnalytics(selectedSubject);

  return (
    <AnalyticsContext.Provider value={{ summary, loading, error, selectSubject, refresh }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) throw new Error('useAnalytics must be used within AnalyticsProvider');
  return context;
};

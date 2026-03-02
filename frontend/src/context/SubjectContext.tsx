import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { Subject } from '@/types';

interface SubjectContextType {
  subjects: Subject[];
  addSubject: (subject: Omit<Subject, 'id' | 'created_at'>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  editSubject: (id: number, subject: Omit<Subject, 'id' | 'created_at'>) => Promise<void>; // ← add this
  loading: boolean;
}


const SubjectContext = createContext<SubjectContextType | undefined>(undefined);

export const SubjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  // Utility: convert backend subject to frontend Subject
  const toSubject = (backend: any): Subject => ({
    id: backend.id,
    subjectCode: backend.subject_code,
    subjectName: backend.subject_name,
    academicYear: backend.academic_year,
    semester: backend.semester,
    regulation: backend.regulation,
    courseType: backend.course_type,
    numberOfCOs: backend.number_of_cos,
    created_at: backend.created_at,
  });

  // Fetch subjects on mount
  useEffect(() => {
    if (token) {
      fetchSubjects();
    }
  }, [token]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/subjects/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json(); // array of backend objects
        const mappedSubjects = data.map(toSubject) as Subject[];
        setSubjects(mappedSubjects);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSubject = async (subject: Omit<Subject, 'id' | 'created_at'>) => {
    try {
      const response = await fetch('http://localhost:8000/subjects/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject_code: subject.subjectCode,
          subject_name: subject.subjectName,
          academic_year: subject.academicYear,
          semester: subject.semester,
          regulation: subject.regulation,
          course_type: subject.courseType,
          number_of_cos: subject.numberOfCOs,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to add subject: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      const backendSubject = await response.json();
      const newSubject: Subject = toSubject(backendSubject);

      setSubjects(prev => [...prev, newSubject]);
    } catch (error) {
      console.error('Failed to add subject:', error);
      throw error;
    }
  };

  const deleteSubject = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/subjects/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSubjects(prev => prev.filter(s => s.id !== Number(id)));
      } else {
        throw new Error('Failed to delete subject');
      }
    } catch (error) {
      throw error;
    }
  };
  const editSubject = async (id: number, subject: Omit<Subject, 'id' | 'created_at'>) => {
  try {
    const response = await fetch(`http://localhost:8000/subjects/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject_code: subject.subjectCode,
        subject_name: subject.subjectName,
        academic_year: subject.academicYear,
        semester: subject.semester,
        regulation: subject.regulation,
        course_type: subject.courseType,
        number_of_cos: subject.numberOfCOs,
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update subject');
    }

    const backendSubject = await response.json();
    const updatedSubject: Subject = toSubject(backendSubject);

    setSubjects(prev => prev.map(s => s.id === id ? updatedSubject : s));
  } catch (error) {
    console.error('Failed to edit subject:', error);
    throw error;
  }
};

  return (
    <SubjectContext.Provider value={{ 
      subjects, 
      addSubject, 
      deleteSubject,
      editSubject, 
      loading 
    }}>
      {children}
    </SubjectContext.Provider>
  );
};

export const useSubjects = () => {
  const context = useContext(SubjectContext);
  if (!context) {
    throw new Error('useSubjects must be used within SubjectProvider');
  }
  return context;
};

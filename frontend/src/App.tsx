import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SubjectProvider } from "@/context/SubjectContext";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SubjectsPage from "./pages/SubjectsPage";
import DirectAttainmentPage from "./pages/DirectAttainmentPage";
import IndirectAttainmentPage from "./pages/IndirectAttainmentPage";
import COPOMappingPage from "./pages/COPOMappingPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import NotFound from "./pages/NotFound";
import FinalCoAttainment from "./pages/FinalCoAttainment";
import FinalAttainmentPage from "./pages/FinalAttainmentPage";
import UniversityPrediction from "./pages/UniversityPredictionPage";
import { AnalyticsProvider } from '@/context/AnalyticsContext';

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  return (
    
      <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={<RegisterPage />} /> {/* ✅ NEW */}
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/subjects" element={<ProtectedRoute><SubjectsPage /></ProtectedRoute>} />
      <Route path="/direct-attainment" element={<ProtectedRoute><DirectAttainmentPage /></ProtectedRoute>} />
      <Route path="/indirect-attainment" element={<ProtectedRoute><IndirectAttainmentPage /></ProtectedRoute>} />
      <Route path="/final-co-attainment" element={<ProtectedRoute><FinalCoAttainment/></ProtectedRoute>} />
      <Route path="/final-attainment" element={<ProtectedRoute><FinalAttainmentPage/></ProtectedRoute>}/>
      <Route path="/co-po-mapping" element={<ProtectedRoute><COPOMappingPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/university-prediction" element={<ProtectedRoute><UniversityPrediction /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SubjectProvider>
            <AnalyticsProvider>
            <AppRoutes />
            </AnalyticsProvider>
          </SubjectProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

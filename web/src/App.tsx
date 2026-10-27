import { useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { RequireAuth, useAuth } from './auth.tsx';
import { BottomNav, Loading } from './components/ui.tsx';
import { Welcome } from './pages/Welcome.tsx';
import { Login, Register } from './pages/Auth.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { AssessmentList } from './pages/AssessmentList.tsx';
import { AssessmentDetail } from './pages/AssessmentDetail.tsx';
import { Questionnaire } from './pages/Questionnaire.tsx';
import { ResultPage } from './pages/ResultPage.tsx';
import { History } from './pages/History.tsx';
import { SelfCare } from './pages/SelfCare.tsx';
import { Profile } from './pages/Profile.tsx';

function WithNav({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      {children}
      <BottomNav />
    </RequireAuth>
  );
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

export function App() {
  const { pathname } = useLocation();
  // Block body on purpose: newer browsers return a Promise from scrollTo, which
  // React would otherwise treat as the effect's cleanup function and crash.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<PublicOnly><Welcome /></PublicOnly>} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
        <Route path="/home" element={<WithNav><Dashboard /></WithNav>} />
        <Route path="/assessments" element={<WithNav><AssessmentList /></WithNav>} />
        <Route path="/assessments/:id" element={<RequireAuth><AssessmentDetail /></RequireAuth>} />
        <Route path="/assessments/:id/take" element={<RequireAuth><Questionnaire /></RequireAuth>} />
        <Route path="/results/:id" element={<RequireAuth><ResultPage /></RequireAuth>} />
        <Route path="/history" element={<WithNav><History /></WithNav>} />
        <Route path="/care" element={<WithNav><SelfCare /></WithNav>} />
        <Route path="/profile" element={<WithNav><Profile /></WithNav>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

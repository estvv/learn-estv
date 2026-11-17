import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider, useAuth } from './app/auth';
import { Layout } from './app/Layout';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { HomePage } from './pages/HomePage';
import { LessonPage } from './pages/LessonPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReviewPage } from './pages/ReviewPage';
import { PracticePage } from './pages/PracticePage';
import { SettingsPage } from './pages/SettingsPage';
import { StepPage } from './pages/StepPage';
import { SubjectPage } from './pages/SubjectPage';

// Waits for the session check so pages know whether this is a guest.
function Gate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  if (loading) return null;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Gate>
          <Routes>
            <Route path="s/:subject/pratique" element={<PracticePage />} />
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="s/:subject" element={<SubjectPage />} />
              <Route path="s/:subject/etape/:path/:unit/:step" element={<StepPage />} />
              <Route path="s/:subject/revisions" element={<ReviewPage />} />
              <Route path="s/:subject/lecon/:lesson" element={<LessonPage />} />
              <Route path="reglages" element={<SettingsPage />} />
              <Route path="connexion" element={<LoginPage />} />
              <Route path="compte" element={<AccountPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="profils/:username" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Gate>
      </BrowserRouter>
    </AuthProvider>
  );
}

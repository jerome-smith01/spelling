import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import AuthBanner from './components/AuthBanner';
import PracticePage from './pages/PracticePage';
import ProgressPage from './pages/ProgressPage';
import WordDetailPage from './pages/WordDetailPage';
import DashboardPage from './pages/DashboardPage';
import LabPage from './pages/LabPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import { useTheme } from './hooks/useTheme';
import { AuthProvider } from './hooks/useAuth';
import { ListsProvider } from './hooks/useLists';
import { TutorialProvider } from './hooks/useTutorial';
import TutorialOverlay from './components/TutorialOverlay';
import './styles/global.css';

// Move keyboard/screen-reader focus to the page heading on route change
function FocusOnNavigate() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.querySelector('main h2')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

/**
 * URL scheme (relative to the /spelling/app base):
 *   /                          -> deck dashboard (all decks, progress, practice/quiz entry)
 *   /lists                     -> redirects to the dashboard
 *   /lists/default             -> built-in default list
 *   /lists/:listId             -> practice one list, immersive (id is a UUID; ?mode=quiz opens the quiz)
 *   /progress                  -> progress dashboard (?list=<id> filter)
 *   /progress/words/:word      -> one word: letter-by-letter results and its tip
 *   /profile                   -> grade + pattern progress table (Generate 5 words)
 */
export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <AuthProvider>
      <ListsProvider>
       <TutorialProvider>
        <AppShell theme={theme} onToggleTheme={toggleTheme}>
          <FocusOnNavigate />
          <AuthBanner />
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/lists" element={<Navigate to="/" replace />} />
            <Route path="/lists/:listId" element={<PracticePage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/progress/words/:word" element={<WordDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/lab" element={<LabPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppShell>
        <TutorialOverlay />
       </TutorialProvider>
      </ListsProvider>
    </AuthProvider>
  );
}

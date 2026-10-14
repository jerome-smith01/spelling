import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import WhoPage from './pages/WhoPage';
import FamilyPage from './pages/FamilyPage';
import ReportPage from './pages/ReportPage';
import LearnerBanner from './components/layout/LearnerBanner';
import { LearnerProvider, useLearner } from './hooks/useLearner';
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

// Kid mode shows practice only: anything else goes back to the decks
function GrownUpsOnly({ children }) {
  const { kidMode } = useLearner();
  return kidMode ? <Navigate to="/" replace /> : children;
}

// Everything under here is one learner's data: switching learner starts the screens afresh
function LearnerRoutes() {
  const { activeId } = useLearner();
  return (
    <Routes key={activeId ?? 'me'}>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/lists" element={<Navigate to="/" replace />} />
      <Route path="/lists/:listId" element={<PracticePage />} />
      <Route path="/progress" element={<GrownUpsOnly><ProgressPage /></GrownUpsOnly>} />
      <Route path="/progress/words/:word" element={<WordDetailPage />} />
      <Route path="/profile" element={<GrownUpsOnly><ProfilePage /></GrownUpsOnly>} />
      <Route path="/who" element={<WhoPage />} />
      <Route path="/family" element={<GrownUpsOnly><FamilyPage /></GrownUpsOnly>} />
      <Route path="/family/:learnerId/report" element={<GrownUpsOnly><ReportPage /></GrownUpsOnly>} />
      <Route path="/lab" element={<GrownUpsOnly><LabPage /></GrownUpsOnly>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
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
 *   /who                       -> "Who's practising?" (children + grown-up; starts kid mode)
 *   /family                    -> add and manage children, this week's summary, the grown-up PIN (not in kid mode)
 *   /family/:learnerId/report  -> printable report (Download PDF / Download HTML) for a child (not in kid mode)
 */
export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <AuthProvider>
     <LearnerProvider>
      <ListsProvider>
       <TutorialProvider>
        <AppShell theme={theme} onToggleTheme={toggleTheme}>
          <FocusOnNavigate />
          <LearnerBanner />
          <AuthBanner />
          <LearnerRoutes />
        </AppShell>
        <TutorialOverlay />
       </TutorialProvider>
      </ListsProvider>
     </LearnerProvider>
    </AuthProvider>
  );
}

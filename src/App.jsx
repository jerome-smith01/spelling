import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import AuthBanner from './components/AuthBanner';
import PracticePage from './pages/PracticePage';
import ProgressPage from './pages/ProgressPage';
import WordDetailPage from './pages/WordDetailPage';
import ListsPage from './pages/ListsPage';
import RootRedirect from './pages/RootRedirect';
import NotFoundPage from './pages/NotFoundPage';
import LabPage from './pages/LabPage';
import { useTheme } from './hooks/useTheme';
import { AuthProvider } from './hooks/useAuth';
import { ListsProvider } from './hooks/useLists';
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
 *   /                          -> last-used list
 *   /lists                     -> all lists
 *   /lists/default             -> built-in default list
 *   /lists/:listId             -> practice one list (id is a UUID)
 *   /progress                  -> progress dashboard (?list=<id> filter)
 *   /progress/words/:word      -> one word: letter-by-letter results and its tip
 */
export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <AuthProvider>
      <ListsProvider>
        <AppShell theme={theme} onToggleTheme={toggleTheme}>
          <FocusOnNavigate />
          <AuthBanner />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/lists" element={<ListsPage />} />
            <Route path="/lists/:listId" element={<PracticePage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/progress/words/:word" element={<WordDetailPage />} />
            <Route path="/lab" element={<LabPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppShell>
      </ListsProvider>
    </AuthProvider>
  );
}

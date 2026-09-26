import React, { useState } from 'react';
import AppShell from './components/layout/AppShell';
import PracticePage from './pages/PracticePage';
import ProgressPage from './pages/ProgressPage';
import { useTheme } from './hooks/useTheme';
import { AuthProvider } from './hooks/useAuth';
import './styles/global.css';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [activePage, setActivePage] = useState('practice');

  return (
    <AuthProvider>
      <AppShell
        activePage={activePage}
        onNavigate={setActivePage}
        theme={theme}
        onToggleTheme={toggleTheme}
      >
        {activePage === 'practice' && <PracticePage />}
        {activePage === 'progress' && <ProgressPage />}
      </AppShell>
    </AuthProvider>
  );
}

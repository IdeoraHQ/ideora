import React, { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { PresenceProvider } from '@/context/PresenceContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppRoutes } from '@/routes';
import { ContextualFeedbackPrompt } from '@/components/feedback/ContextualFeedbackPrompt';
import { FloatingAiLauncher } from '@/components/ai/FloatingAiLauncher';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <PresenceProvider>
          <ThemeProvider>
            <AppRoutes />
            <FloatingAiLauncher />
            <ContextualFeedbackPrompt />
          </ThemeProvider>
        </PresenceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

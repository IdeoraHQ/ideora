import React, { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppRoutes } from '@/routes';
import { ContextualFeedbackPrompt } from '@/components/feedback/ContextualFeedbackPrompt';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ScrollToTop />
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
          <ContextualFeedbackPrompt />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

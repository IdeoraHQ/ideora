import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppRoutes } from '@/routes';
import { ContextualFeedbackPrompt } from '@/components/feedback/ContextualFeedbackPrompt';

export const App: React.FC = () => {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
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

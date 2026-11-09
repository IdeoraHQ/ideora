import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      '@supabase/supabase-js',
    ],
  },
  server: {
    port: 5173,
    host: true,
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/routes/index.tsx',
        './src/pages/HomePage.tsx',
        './src/pages/ExplorePage.tsx',
        './src/pages/AuthPage.tsx',
        './src/pages/IdeaDetailPage.tsx',
        './src/pages/DashboardPage.tsx',
        './src/pages/ProfilePage.tsx',
        './src/pages/CreateIdeaPage.tsx',
      ],
    },
  },
});

import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function localAiApiDevPlugin(): Plugin {
  return {
    name: 'ideora-local-ai-api',
    configureServer(server) {
      // Load both frontend/.env* and root .env* into process.env for local API routes
      const rootEnv = loadEnv(server.config.mode, path.resolve(__dirname, '..'), '');
      const frontendEnv = loadEnv(server.config.mode, __dirname, '');
      Object.assign(process.env, rootEnv, frontendEnv);

      server.middlewares.use(async (req, res, next) => {
        const urlStr = req.url || '';
        if (!urlStr.startsWith('/api/ai/')) {
          return next();
        }

        const parsedUrl = new URL(urlStr, 'http://localhost:5173');
        const routeName = parsedUrl.pathname.replace(/^\/api\/ai\//, '').replace(/\/+$/, '');
        if (!['chat', 'conversations', 'usage'].includes(routeName)) {
          return next();
        }

        try {
          const modulePath = path.resolve(__dirname, `../api/ai/${routeName}.ts`);
          const mod = await server.ssrLoadModule(modulePath);
          const handler = mod.default;

          const bodyText = await new Promise<string>((resolve) => {
            if (req.method === 'GET' || req.method === 'HEAD') {
              resolve('');
              return;
            }
            const chunks: Buffer[] = [];
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
          });

          const query: Record<string, string> = {};
          parsedUrl.searchParams.forEach((v, k) => {
            query[k] = v;
          });

          const apiReq = {
            method: req.method,
            headers: req.headers,
            query,
            body: bodyText ? JSON.parse(bodyText) : undefined,
          };

          let statusCode = 200;
          const apiRes = {
            status(code: number) {
              statusCode = code;
              return apiRes;
            },
            setHeader(name: string, value: string) {
              res.setHeader(name, value);
            },
            json(payload: unknown) {
              res.statusCode = statusCode;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(payload));
            },
            end() {
              res.statusCode = statusCode;
              res.end();
            },
          };

          await handler(apiReq, apiRes);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              error: (err as Error)?.message || 'Local AI API middleware error.',
            })
          );
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localAiApiDevPlugin()],
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

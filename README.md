# IDEORA

> **Where unfinished ideas meet the people who build them.**  
> IDEORA is a collaborative platform designed for founders, engineers, designers, and creators to publish early-stage concepts, discover like-minded collaborators, and turn visionary ideas into production-ready software.

---

## 🛠️ Technology Stack

IDEORA is engineered as a modern, high-performance, serverless web application:

- **Frontend Core**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool & Bundler**: [Vite 6](https://vite.dev/)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) + [PostCSS](https://postcss.org/) + [Autoprefixer](https://github.com/postcss/autoprefixer)
- **Routing**: [React Router DOM v6](https://reactrouter.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend & Data**: [Supabase](https://supabase.com/) (Auth, PostgreSQL Database, Storage, Realtime)
- **Deployment Target**: [Vercel](https://vercel.com/) (Serverless Architecture)
- **Code Quality**: [ESLint 9](https://eslint.org/) (Flat Config) + [Prettier](https://prettier.io/)

---

## 📁 Project Architecture

The codebase follows a modular, feature-oriented structure designed for scalability and collaborative clarity:

```text
ideora/
├── public/                 # Static assets (favicons, robots.txt, icons)
├── src/
│   ├── assets/             # Images, SVGs, and brand design assets
│   ├── components/         # Reusable presentation components (Navbar, Footer, UI primitives)
│   ├── features/           # Domain-driven features (ideas, profiles, collaborations)
│   ├── hooks/              # Custom React hooks (e.g. useSupabaseStatus, useAuth)
│   ├── layouts/            # Page layouts and chrome wrappers (MainLayout)
│   ├── pages/              # Route-level views (HomePage, ExplorePage, NotFoundPage)
│   ├── routes/             # Client-side route declarations
│   ├── services/           # External service clients & API layers (Supabase)
│   ├── types/              # Centralized TypeScript domain interfaces and schemas
│   ├── utils/              # Pure utility functions (e.g., classname mergers)
│   ├── App.tsx             # Root application component
│   ├── index.css           # Global Tailwind directives and base typography
│   ├── main.tsx            # Application entry point
│   └── vite-env.d.ts       # Vite client and environment type definitions
├── .env.example            # Template for environment variables (safe to commit)
├── .gitignore              # Repository gitignore (strict secret & artifact exclusions)
├── .prettierrc             # Code formatting configuration
├── .prettierignore         # Prettier exclusion list
├── eslint.config.js        # ESLint 9 configuration
├── index.html              # HTML shell entry point
├── package.json            # Project dependencies and script declarations
├── postcss.config.js       # PostCSS plugins (Tailwind, Autoprefixer)
├── tailwind.config.js      # Tailwind CSS theme configuration
├── tsconfig.json           # Root TypeScript configuration
├── tsconfig.app.json       # Application-specific compiler options
├── tsconfig.node.json      # Bundler & tooling compiler options
└── vite.config.ts          # Vite bundler configuration with `@/` alias
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or `v22.x+` (LTS recommended)
- **npm**: `v10.x+`
- **Git**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/IdeoraHQ/ideora.git
   cd ideora
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and configure your Supabase project keys:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Launch the development server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 📜 Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts the Vite local development server with HMR |
| `npm run build` | Runs TypeScript compilation check and generates production bundle in `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm run typecheck` | Validates TypeScript types across the entire project (`tsc -b --noEmit`) |
| `npm run lint` | Runs ESLint to detect stylistic and logical issues |
| `npm run lint:fix` | Automatically fixes autofixable ESLint errors |
| `npm run format` | Formats all code with Prettier |
| `npm run format:check` | Verifies code formatting compliance in CI/CD |

---

## 🤝 GitHub Collaboration Workflow (Co-Founders & Team)

To maintain stability and enable clean parallel development:

### 1. Branch Strategy
- **`main`**: Protected production-ready branch. Never commit directly to `main`.
- **`feature/<feature-name>`**: For new features (e.g., `feature/idea-submission-modal`).
- **`fix/<bug-name>`**: For bug fixes.
- **`chore/<task-name>`**: For maintenance, refactoring, or dependency updates.

### 2. Pull Request (PR) Standard
1. Create a feature branch off `main`:
   ```bash
   git checkout -b feature/your-feature
   ```
2. Commit small, descriptive commits following conventional commit guidelines:
   - `feat: add tag filtering to explore ideas page`
   - `fix: correct mobile layout overflow in navbar`
3. Before pushing, verify all quality gates pass:
   ```bash
   npm run typecheck
   npm run lint
   npm run build
   ```
4. Push your branch and open a Pull Request against `main`.
5. Have the second co-founder review and approve before merging via **Squash & Merge** or standard merge.

### 3. Security & Secrets Management
- **Never commit `.env` or `.env.local`**: Verified excluded in `.gitignore`.
- **Supabase Keys**:
  - `VITE_SUPABASE_ANON_KEY` is a client-safe key designed for public frontend use with Supabase Row Level Security (RLS).
  - **NEVER** expose the Supabase `service_role` key, database passwords, or private API keys in client-side code or git commits.

---

## ☁️ Deployment

IDEORA is configured for seamless deployment on **Vercel**:
1. Connect the repository `IdeoraHQ/ideora` to Vercel.
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Set Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the Vercel project dashboard.
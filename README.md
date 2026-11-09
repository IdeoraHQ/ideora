# IDEORA

<div align="center">
  <img src="frontend/public/favicon.svg" alt="IDEORA Official Logo" width="80" height="80" />
  <h3>Where ambitious ideas find their builders.</h3>
  <p>The collaborative venture ecosystem for early-stage initiatives, co-founder matching, and senior technical adoption.</p>
</div>

---

## 💡 Overview

**IDEORA** connects idea creators, technical co-founders, and fullstack builders into unified development pods. Instead of leaving innovative product concepts abandoned in notebooks or social media threads, IDEORA provides a structured workspace for publishing concepts, discovering validated ideas, assembling core engineering talent, and building real-world software.

- **Explore & Discover**: Search, filter, and review community-submitted concepts by domain, stack, and collaboration model.
- **Role-Based Applications**: Apply directly to open founder roles (Frontend, Backend, Fullstack, UI/UX, AI/ML, Growth).
- **Builder Profiles**: Showcase contributions, skills, verified GitHub links, and launched initiatives.
- **Real-Time Collaboration**: Manage incoming team applications, upvotes, and technical architecture feedback.

---

## 🛠️ Technology Stack

IDEORA is engineered as a modern, high-performance, modular web application:

- **Frontend Core**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite 6](https://vite.dev/)
- **Styling & Design System**: [Tailwind CSS v3](https://tailwindcss.com/)
- **Typography System**: [Outfit](https://fonts.google.com/specimen/Outfit) (Variable WOFF2 + Google Fonts fallback)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router DOM v6](https://reactrouter.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL 15, Row Level Security, Triggers & Auth)
- **Deployment**: [Vercel](https://vercel.com/) / [Netlify](https://netlify.com/)

---

## 📁 Repository Structure

```text
ideora/
├── backend/
│   └── supabase/
│       ├── config.toml
│       └── migrations/
│           ├── 20261102000001_initial_schema.sql
│           ├── 20261107000002_workflow_triggers_and_comments.sql
│           └── 20261108000003_backend_security_hardening.sql
├── docs/
│   ├── BACKEND_ARCHITECTURE.md
│   ├── README.md
│   └── STRUCTURE.md
├── frontend/
│   ├── public/
│   │   ├── apple-touch-icon.png
│   │   ├── favicon-32x32.png
│   │   ├── favicon.svg
│   │   ├── fonts/
│   │   ├── og-image.png
│   │   └── og-image.svg
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   ├── .env.example
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/IdeoraHQ/ideora.git
cd ideora
npm install --prefix frontend
```

### 3. Environment Configuration

The repository includes a ready-to-run `.env` file in `frontend/`. For custom overrides:

```bash
cp frontend/.env.example frontend/.env.local
```

### 4. Running Locally

Start the Vite development server:

```bash
npm run dev
# or: cd frontend && npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Production Build & Typecheck

```bash
npm run typecheck
npm run build
```

---

## 🛡️ License

Private repository &copy; 2026 IDEORA HQ. All rights reserved.

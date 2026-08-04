# Hive

**K20's Hub for Integrated Visual Education** — a visual learning platform where
educators curate boards of resources (links, images, videos, and notes) organized
into columns and groups, then share them with students through a simple link.

Inspired by tools like Wakelet, Hive is built for K‑12 classrooms: educators sign
in to build and manage boards, while students open a shared board link and browse
it read‑only — no account required.

---

## Features

- **Boards → Columns → Groups → Cards** — a flexible hierarchy for organizing content. Groups are optional, so cards can also live directly on a column.
- **Rich cards** — title, description, a link, and either an uploaded image or a YouTube embed. Cards can be reordered and moved between groups.
- **Invitation‑only admin access** — the public can only view shared boards. New admins join via a single‑use invitation key emailed from the admin dashboard.
- **Admin dashboard** — manage invitations and users (promote/demote admins, remove users).
- **Public sharing** — every board has a shareable link (`/boards/:id`) that anyone can open read‑only. Editing controls appear only for signed‑in admins.
- **Cover images** — boards and cards support image upload or an image URL, with live previews.
- **Bookmarks & references** — students can bookmark cards (stored locally) and jump straight to them; admins can attach a reference list to each board.
- **Search** — filter cards within a board by title or description.
- **Accessibility** — keyboard‑navigable with visible focus, ARIA labels, focus‑trapped modals, a skip link, reduced‑motion support, and hover/focus tooltips (WCAG 2.1 AA / Section 508 baseline).

---

## Tech stack

| Layer | Technology |
|---|---|
| **Backend** | AdonisJS 6 (TypeScript), Lucid ORM, PostgreSQL, access‑token auth, Nodemailer (SMTP) |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS v4, TanStack Query, Zustand, React Router, axios, lucide‑react |
| **Hosting** | Backend on Render, frontend on Netlify |

---

## Project structure

```
.
├── server/        # AdonisJS API (auth, boards, cards, invitations, admin)
│   ├── app/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── services/        # mail_service, etc.
│   │   └── transformers/
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeders/         # admin user + demo board
│   │   └── schema.ts        # auto-generated model schema
│   └── start/routes.ts      # all API routes (prefixed /api/v1)
├── client/        # React + Vite single-page app
│   └── src/
│       ├── pages/           # BoardList, Board, Login, Signup, Admin
│       ├── components/
│       ├── hooks/           # useBoard, useBoardMutations, useBookmarks, …
│       └── store/           # Zustand auth store
└── netlify.toml   # frontend build + SPA redirect
```

---

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (local or hosted)

### 1. Backend (`server/`)

```bash
cd server
npm install
cp .env.example .env        # then fill in real values (see below)
node ace migration:run      # create the database tables
node ace db:seed            # optional: create a default admin (+ demo board in dev)
npm run dev                 # starts the API on http://localhost:3333
```

### 2. Frontend (`client/`)

```bash
cd client
npm install
# point the SPA at your API (defaults to http://localhost:3333/api/v1)
echo "VITE_API_URL=http://localhost:3333/api/v1" > .env.local
npm run dev                 # starts the app on http://localhost:5173
```

Open http://localhost:5173 and sign in with the seeded admin account.

---

## Environment variables

### Server (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `APP_KEY` | yes | App encryption key (`node ace generate:key`) |
| `APP_URL` | yes | Public URL of the API |
| `HOST`, `PORT` | yes | Bind host/port (default `0.0.0.0` / `3333`) |
| `NODE_ENV` | yes | `development` \| `production` \| `test` |
| `DB_CONNECTION` | yes | `pg` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` | yes | PostgreSQL connection |
| `CORS_ORIGIN` | prod | Allowed frontend origin (e.g. your Netlify URL) |
| `FRONTEND_URL` | prod | Base URL used to build signup links in invitation emails |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` | optional | Transactional email. If omitted, codes/links print to the server console for local testing. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | optional | Credentials for the seeded default admin |

### Client (`client/.env.local`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the API, including `/api/v1` |

---

## Database

```bash
node ace migration:run           # apply pending migrations
node ace migration:rollback      # undo the last batch
node ace db:seed                 # run all seeders
node ace db:seed --files admin_user_seeder   # run one seeder
```

Seeders live in `server/database/seeders/`:

- **`admin_user_seeder`** — idempotently bootstraps an admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (falls back to a default with a warning). Runs in every environment.
- **`demo_board_seeder`** — sample board with columns, groups, and cards. **Development/test only.**

---

## Authentication model

- **Admins** sign in with email + password and can create/edit boards, cards, invitations, and users.
- **New admins** are added by invitation only: an existing admin sends a single‑use key by email, and the recipient sets a password at `/signup?key=…`.
- **Students / the public** never sign in. They open a shared board link (`/boards/:id`) and view it read‑only. The board list and admin dashboard are admin‑only.

---

## Deployment

- **Backend → Render.** The `start:prod` script runs pending migrations before booting (`node ace migration:run --force && node bin/server.js`). Set all server env vars in the Render dashboard.
- **Frontend → Netlify.** Config in [`netlify.toml`](netlify.toml): builds `client/` and serves `dist/` with an SPA fallback redirect. Set `VITE_API_URL` in Netlify to your Render API URL.

---

## Scripts

**Server** (`cd server`)

| Command | Description |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Compile to `build/` |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` / `npm run format` | Lint / Prettier |
| `node ace ...` | Migrations, seeders, and other AdonisJS commands |

**Client** (`cd client`)

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint |

---

## Repository

The project is hosted on the K20 Center GitLab and mirrored to GitHub:

- GitLab: `https://delta.k20center.ou.edu/interactive-learning/web/wakelet`
- GitHub: `https://github.com/tadiwamandava/fakelet-main`

A single `git push` updates both remotes.

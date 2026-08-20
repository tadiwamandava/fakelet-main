# Hive

**K20's Hub for Integrated Visual Education** — educators curate boards of
resources (links, images, videos, documents) organised into columns and groups,
then share them with students through a link. Students open a shared board and
browse it read-only; no account required.

## Features

- **Boards → Columns → Groups → Cards.** Groups are optional, so cards can sit directly on a column.
- **Rich cards** — title, description, link, an image or YouTube embed, and downloadable file attachments (PDF, Word, PowerPoint, Excel, text, CSV). Cards reorder and move between groups.
- **Images added by URL are downloaded** and stored locally, so a board does not break when the source link disappears.
- **Public sharing** — every board has a link (`/boards/:id`) anyone can open read-only. Editing controls appear only for signed-in admins.
- **Invitation-only admin access** — new admins join via a single-use key emailed from the admin dashboard.
- **Admin dashboard** — manage invitations and users.
- **Bookmarks, references and search** within a board.

## Stack

One deployable: an **AdonisJS 7** app that server-renders **React 19** pages via
**Inertia.js**. TypeScript throughout, Lucid ORM on PostgreSQL, Vite + Tailwind
CSS v4 for assets, Nodemailer for transactional mail.

A token-based JSON API remains at `/api/v1` for future integrations.

## Project structure

```
server/                     # the whole application
├── app/
│   ├── controllers/        # *_pages_controller = Inertia pages; the rest = /api/v1
│   ├── models/  services/  middleware/  helpers/
├── inertia/                # React frontend
│   ├── pages/              # auth, boards, admin, errors
│   ├── components/  hooks/  lib/
├── database/               # migrations, seeders, generated schema.ts
├── resources/views/        # Edge layout that boots the React app
└── start/routes.ts         # web (session) + /api/v1 (token) routes

client/                     # legacy SPA, superseded by server/inertia
```

## Getting started

Requires Node.js 20+ and PostgreSQL.

```bash
cd server
npm install
cp .env.example .env        # then fill in APP_KEY, DB_*, APP_URL
node ace migration:run
node ace db:seed            # first admin + a demo board
npm run dev                 # http://localhost:3333
```

In development the seeded admin is `admin@k20center.ou.edu` / `itsjustatest`.

## Environment

| Variable | Notes |
|---|---|
| `APP_KEY` | Generate with `node ace generate:key`. Changing it invalidates sessions and tokens. |
| `APP_URL` | Public URL. Also used for invitation links. |
| `HOST`, `PORT`, `NODE_ENV`, `LOG_LEVEL` | Standard. |
| `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` | PostgreSQL. |
| `SESSION_DRIVER` | `cookie`. |
| `UPLOADS_DIR` | **Must be outside the build directory** — `node ace build` recreates it, deleting uploads. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` | Optional. Omit `SMTP_HOST` to print invitation links and reset codes to the console. Credentials are only sent when set, so an unauthenticated relay works. `SMTP_FROM` defaults to `no-reply@<APP_URL host>`. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Optional; only used when the seeder creates the first admin. |
| `CORS_ORIGIN`, `FRONTEND_URL` | Only needed if the frontend is ever served from a different origin. |

## Database

```bash
node ace migration:run                                    # apply migrations
node ace migration:fresh                                  # drop and rebuild
node ace db:seed --files database/seeders/admin_user_seeder.ts
```

`admin_user_seeder` is idempotent: it never changes an existing account's
password, so `ADMIN_PASSWORD` has no effect once the admin exists. Outside
development it generates a random password rather than using a fixed one.
`demo_board_seeder` is development/test only.

## Security model

Two deliberately separate surfaces (see `app/helpers/api_surface.ts`):

| | Guard | CSRF |
|---|---|---|
| `/api/v1/*` | token only | exempt |
| everything else | session only | enforced |

They must not overlap: a CSRF-exempt route that accepted cookie auth would be a
CSRF hole. Uploads are served with `Content-Disposition: attachment` unless they
are images, and remote image fetches refuse private and link-local addresses.

## Deployment

```bash
npm ci && npm run build
cd build && node bin/server.js     # start:prod runs migrations first
```

One process serves the app, the API and uploads. Point `UPLOADS_DIR` at
persistent storage and put a TLS-terminating reverse proxy in front.

## Repository

Mirrored to the K20 Center GitLab and GitHub; one `git push` updates both.

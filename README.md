# Hive

**K20's Hub for Integrated V(something) Education** — educators curate boards of
resources (links, images, videos, documents) organised into columns and groups,
then share them with students through a link. Students open a shared board and
browse it read-only; no account required.

## Features

- **Boards → Columns → Groups → Cards.** Groups are optional, so cards can sit directly on a column.
- **Rich cards** — an optional title, description, link, an image or YouTube embed, and downloadable file attachments (PDF, Word, PowerPoint, Excel, text, CSV). A card needs some content, but not a title, so an image or a link can stand on its own.
- **Drag and drop** — columns, groups and cards are rearranged by their grip handle in edit mode, and cards and groups can be dragged between containers. Dragging starts only from the handle, so scrolling on a touchscreen is unaffected; the same handle works from the keyboard (focus it, press space, move with the arrow keys).
- **Images added by URL are downloaded** and stored locally, so a board does not break when the source link disappears.
- **Public sharing** — every board has a link (`/boards/:id`) anyone can open read-only. Editing controls appear only for signed-in admins.
- **Invitation-only admin access** — new admins join via a single-use key emailed from the admin dashboard.
- **Two admin tiers.** Ordinary admins curate boards and may invite people. **Master admins** own access control: granting and revoking admin, handing out master, deleting accounts, and revoking invitations. Ordinary admins can grow the admin list but never shrink it.
- **Master-only tools** — an activity log of every access change, signing an account out of every session and API token, setting someone's password, and a per-board recycle bin for restoring deleted cards.
- **Admin dashboard** — manage invitations, users and activity.
- **Collaborative rich text.** Card descriptions and a per-board notes document are edited by several admins at once, with live carets and no save button — changes merge as they are typed. Students read the notes through the same shared link.
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

## Concurrent editing

Several admins can hold the same board open, so every write that could race
another goes through `app/services/board_writes.ts`, shared by the pages and
`/api/v1`:

- **Positions are assigned by the database**, never sent by the client — two
  people adding at once would otherwise claim the same slot, and tied rows come
  back in an arbitrary order, which reads as things moving or vanishing.
- **Card edits carry the version they were loaded at** and are refused if the
  row has moved on, instead of overwriting the other person's save.
- **Parents are checked inside the writing transaction**, so a group deleted a
  moment ago fails cleanly rather than raising a foreign-key error or leaving a
  card attached to nothing.
- **Deletes do not destroy other people's work.** Removing a group moves its
  cards up into the column; removing a column archives them.

A refused write comes back as a message on the board, and the card editor stays
open with what you typed still in it.

## Live board updates

Admins viewing a board are told over Server-Sent Events when another admin
changes it, and the board refreshes itself — so a column someone else deleted
does not linger on your screen. The server broadcasts only "board N changed";
the client re-fetches through the page it is already on. Students on a shared
link are not subscribed: they read boards without an account, and one open
connection per student per board buys them nothing.

Two constraints come with it:

- **The reverse proxy must not buffer or compress `text/event-stream`.** On
  nginx, for the `__transmit` location: `proxy_buffering off; gzip off;
  proxy_http_version 1.1; proxy_read_timeout 1h;`.
- **One process only.** This applies twice over — `config/transmit.ts` broadcasts in-process, and the collaboration socket holds documents in memory. Two people editing the same card on different instances would silently diverge, each saving over the other. Under PM2
  cluster mode or behind more than one instance, an admin connected to one
  instance never hears about a write served by another — silently. Adding
  instances means adding a Redis transport in the same change.

## Deployment

```bash
npm ci && npm run build
cd build && node bin/server.js     # start:prod runs migrations first
```

One process serves the app, the API and uploads. Point `UPLOADS_DIR` at
persistent storage and put a TLS-terminating reverse proxy in front (see the
SSE constraints above).

## Repository

Mirrored to the K20 Center GitLab and GitHub; one `git push` updates both.

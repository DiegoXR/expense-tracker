# Expense Tracker

A small, self-hosted app for splitting shared expenses — between a couple, roommates, or a group of friends on a trip.

It started as a replacement for the parts of Splitwise that actually matter day to day: log who paid, decide how it splits, and see at a glance who owes whom. No ads, no expense limits, no account on someone else's server — you deploy it to your own Cloudflare account and the data lives in your own database.

It is designed **mobile-first**: the main use is pulling out your phone right after paying for something.

> **Status:** early and actively developed. The core flow works; expect rough edges.

## Features

- **Groups** with their own currency and members (e.g. "Home", "Trip to Cartagena").
- **Expenses** with a payer, a category, a date and a percentage split per member. Amounts are stored as integers in the currency's minor unit, so there are no floating-point rounding errors and splits always add up to the exact total.
- **Balances** per member, so everyone can see who owes and who is owed.
- **Settlements** to record payments between members.
- **Categories** shared across groups (groceries, rent, dining out, …).
- **Multiple currencies**, including ones with no minor unit such as COP, KRW, VND or IDR.

## Stack

| Layer      | Technology                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| Framework  | [SvelteKit](https://svelte.dev/docs/kit) + [Svelte 5](https://svelte.dev) + TypeScript                |
| UI         | [Tailwind CSS 4](https://tailwindcss.com), [shadcn-svelte](https://shadcn-svelte.com), Lucide icons   |
| Hosting    | [Cloudflare Workers](https://developers.cloudflare.com/workers/) via `@sveltejs/adapter-cloudflare`   |
| Database   | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)                                       |
| ORM        | [Drizzle ORM](https://orm.drizzle.team) + drizzle-kit for migrations                                  |
| Tooling    | pnpm, Vite, Vitest, ESLint, Prettier, Wrangler                                                        |

## Requirements

- **Node.js 24** or newer
- **pnpm 11** (`corepack enable` will pick up the version pinned in `package.json`)
- A free **[Cloudflare account](https://dash.cloudflare.com/sign-up)** — only needed to deploy. Local development runs entirely on your machine.

The free tiers of Workers and D1 are more than enough for personal use.

## Getting started (local)

Local development uses a local D1 database simulated by Wrangler, so you don't need a Cloudflare account for this part.

```sh
git clone <this-repo-url>
cd expense-tracker
pnpm install

# Create the tables and load the default currencies and categories
pnpm db:migrate:local
pnpm db:seed:local

# Start the dev server
pnpm dev
```

Open the URL Vite prints (usually http://localhost:5173). To test on your phone, run `pnpm dev --host` and open the network URL from a device on the same Wi-Fi.

## Deploying to your own Cloudflare account

Each person who deploys this app gets **their own Worker and their own D1 database** — nothing is shared with anyone else.

1. **Log in to Cloudflare from the CLI**

   ```sh
   pnpm wrangler login
   ```

2. **Create your D1 database**

   ```sh
   pnpm wrangler d1 create expense-tracker
   ```

   Wrangler prints a `database_id`. Copy it.

3. **Point the app at your database.** In [`wrangler.jsonc`](wrangler.jsonc), replace the existing `database_id` with yours:

   ```jsonc
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "expense-tracker",
       "database_id": "<your-database-id>",
       "migrations_dir": "drizzle"
     }
   ]
   ```

   The `database_id` is not a secret — it is only an identifier. Access to the database still requires your Cloudflare credentials. If you choose a database name other than `expense-tracker`, update the `db:*` scripts in `package.json` too.

4. **Create the tables and seed data in the remote database**

   ```sh
   pnpm db:migrate:remote
   pnpm db:seed:remote
   ```

5. **Build and deploy**

   ```sh
   pnpm build
   pnpm wrangler deploy
   ```

   Your app is now live at `https://expense-tracker.<your-subdomain>.workers.dev`.

### ⚠️ Protect your deployment

**The app does not include authentication yet.** Anyone who knows the URL can read and modify your data. Before sharing the link or adding real expenses, put it behind **[Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)** (free for up to 50 users):

1. In the Cloudflare dashboard, set up **Zero Trust** (pick a team name and the Free plan).
2. Go to **Workers & Pages → expense-tracker → Settings → Domains & Routes** and enable Cloudflare Access for **workers.dev** and **Preview URLs**.
3. Edit the generated Access policy so it only allows the email addresses of the people who should use the app.
4. Check it in a private window: you should see a Cloudflare login screen, not the app.

If you add a custom domain later, it needs its own Access application.

## Scripts

| Command                  | What it does                                               |
| ------------------------ | ---------------------------------------------------------- |
| `pnpm dev`               | Start the dev server with a local D1 database              |
| `pnpm build`             | Generate Worker types and build for Cloudflare             |
| `pnpm preview`           | Run the production build locally with Wrangler             |
| `pnpm check`             | Type-check the project                                     |
| `pnpm test`              | Run unit tests (money, split and balance logic)            |
| `pnpm lint` / `format`   | Check / fix formatting and lint rules                      |
| `pnpm gen`               | Regenerate Worker binding types (`wrangler types`)         |
| `pnpm db:generate`       | Generate a new SQL migration after editing the schema      |
| `pnpm db:migrate:local`  | Apply migrations to the local database                     |
| `pnpm db:migrate:remote` | Apply migrations to your Cloudflare D1 database            |
| `pnpm db:seed:local`     | Load default currencies and categories locally             |
| `pnpm db:seed:remote`    | Load default currencies and categories in Cloudflare       |

Seeds are safe to re-run: they use `INSERT OR IGNORE`.

## Changing the database schema

1. Edit [`src/lib/server/db/schema.ts`](src/lib/server/db/schema.ts).
2. Run `pnpm db:generate` to create a new migration in [`drizzle/`](drizzle/).
3. Apply it with `pnpm db:migrate:local`, and with `pnpm db:migrate:remote` when you deploy.

## Project structure

```
src/
├── lib/
│   ├── components/      # App components (+ shadcn-svelte primitives in ui/)
│   ├── domain/          # Pure logic: money, splits, balances, wording
│   └── server/
│       ├── db/          # Drizzle schema and client
│       └── queries/     # Database queries, one file per entity
├── routes/              # Home (groups, people, categories) and group detail
└── hooks.server.ts      # Attaches the database to each request
drizzle/                 # SQL migrations
seed/                    # Default currencies and categories
```

The money and balance logic in `src/lib/domain/` has no dependency on the database or the UI and is covered by unit tests.

## Roadmap

- Built-in authentication (shared password or per-user login)
- Spending reports by category

## License

[MIT](LICENSE)

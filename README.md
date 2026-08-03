# TeamSpend

A mobile-first spending tracker for small teams. Team members can record cash, card, online, and phone-wallet spending; choose who paid; and attach a receipt photo or payment screenshot. Admins can add members and manage currency, budgets, proof requirements, and approval thresholds.

## Run locally

```bash
npm install
npm run dev
```

Without Supabase environment values, the interface runs in a clearly marked demo mode.

## Connect Supabase

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. It creates the team tables and a private `expense-proofs` storage bucket.
3. Copy `.env.example` to `.env.local` and fill in the project URL and service-role key.
4. Restart the app. The first signed-in visitor becomes the initial admin. Every later visitor must first be added by email in Admin.

The service-role key is used only in server route handlers and is never sent to the browser. Production access is designed for a private OpenAI Site, which supplies the signed-in user's verified email to the app server.

## Main routes

- `/` — responsive overview, expense activity, add-expense flow, and admin dashboard
- `/api/bootstrap` — current team, member, settings, and expense data
- `/api/expenses` — validated expense and private proof upload
- `/api/admin/members` — admin-only member creation
- `/api/admin/settings` — admin-only platform settings

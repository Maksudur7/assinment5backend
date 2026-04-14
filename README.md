# NGV Backend

NGV (Next.js Video) platform-er jonno TypeScript + Express + Prisma + Better Auth backend.

## Tech Stack

- Node.js + TypeScript
- Express 5
- Prisma ORM
- PostgreSQL (Neon/local)
- Better Auth (email auth + session)

## Current Features (Implemented)

- Better Auth based signup/signin
- Session-based auth (Bearer token -> session lookup)
- Media listing/filter/details/trending/featured/new releases/recommendations
- Categories + category-wise videos
- Reviews, likes, comments
- Watchlist (toggle/remove/list)
- Dashboard stats + favorites
- Purchases + admin purchase list
- Admin media/review moderation endpoints
- Global/custom rate-limiting
- Standardized error response format

## Project Structure

- `src/app.ts` -> app + middleware + route mount
- `src/server.ts` -> server bootstrap
- `src/lib/better-auth.ts` -> Better Auth config
- `src/lib/prisma.ts` -> Prisma client init (supports `postgres://` and `prisma://` style URLs)
- `src/modules/*` -> service/controller/router per domain
- `prisma/schema.prisma` -> DB models
- `src/seed.ts` -> initial data seed

## Environment Variables

Create `.env` in project root:

```env
DATABASE_URL="postgresql://<user>:<pass>@<host>/<db>?sslmode=require"
PORT="4000"
APP_URL="http://localhost:3000"
FRONTEND_APP_URL="https://ngv-black.vercel.app"
BETTER_AUTH_URL="http://localhost:4000"
BETTER_AUTH_SECRET="your-strong-secret"
STRIPE_SECRET_KEY="sk_test_xxx"
PAYMENT_WEBHOOK_SECRET="replace-with-webhook-shared-secret"
PAYMENT_TOKENIZATION_SECRET="replace-with-strong-tokenization-secret"
JWT_SECRET="not-used-for-main-auth-right-now"
JWT_EXPIRES_IN="7d"
```

> Note: Main auth flow Better Auth session token based. JWT vars currently kept for compatibility.

## Setup & Run

Install:

```bash
npm install
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Push schema:

```bash
npm run prisma:push
```

Seed data:

```bash
npm run seed
```

Run dev server:

```bash
npm run dev
```

## Vercel Deployment

This backend is Vercel-ready via the serverless entrypoint in `api/index.ts`.

- Vercel routes all requests to the Express app.
- Use PowerShell or the Vercel web dashboard if your shell doesn't recognize the `vercel` command.
- Make sure these environment variables are set in Vercel:
  - `DATABASE_URL`
  - `APP_URL`
  - `FRONTEND_APP_URL` (set: `https://ngv-black.vercel.app`)
  - `BETTER_AUTH_URL`
  - `BETTER_AUTH_SECRET`
  - `STRIPE_SECRET_KEY`
  - `PAYMENT_WEBHOOK_SECRET`
  - `PAYMENT_TOKENIZATION_SECRET`

Build:

```bash
npm run build
```

Production start:

```bash
npm run start
```

## Seeded Real Data

`npm run seed` run korle:

### Admin user

- email: `admin@ngv.local`
- password: `admin123456`
- role: `admin`

### Categories

- Action
- Thriller
- Comedy
- Drama
- Sci-Fi

### Media samples

- The Dark Knight Returns
- Galaxy Drift
- Laugh Out Loud

## Auth / Session / Token Notes

- Signup/signin Better Auth API use kore.
- Signin response-e session token return hoy.
- Protected routes require:

```http
Authorization: Bearer <session_token>
```

- Middleware DB `Session` table theke token validate kore.
- Extra session endpoints implemented:
  - `GET /api/auth/sessions`
  - `POST /api/auth/sessions/revoke`
  - `POST /api/auth/refresh-token` (provider token refresh use-case)

## Error Response Format

All API error responses:

```json
{
  "error": true,
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": "Optional"
}
```

## Rate Limits

Configured in `src/app.ts`:

- Global: `1000 req / hour`
- `/api/auth/*`: `10 req / minute`
- `/api/purchases/*`: `50 req / hour`

## API Endpoints (Actual)

### Health

- `GET /health`

### Auth (`/api/auth`)

- `POST /email/signup`
- `POST /email/signin`
- `POST /social/signin`
- `POST /forgot-password`
- `POST /reset-password`
- `GET /session`
- `GET /sessions`
- `POST /sessions/revoke`
- `POST /refresh-token`
- `POST /signout`

### Media (`/api/media`)

- `GET /`
- `GET /trending`
- `GET /featured`
- `GET /new-releases`
- `GET /recommendations` (auth)
- `GET /:id`
- `PUT /:id` (admin)
- `DELETE /:id` (admin)

### Categories (`/api/categories`)

- `GET /`
- `GET /:categoryName/videos`

### Users (`/api/users`)

- `GET /me`
- `PUT /me`
- `GET /me/watch-history`
- `PUT /me/watch-progress/:mediaId`

### Reviews (mounted at `/api`)

- `GET /media/:mediaId/reviews`
- `POST /media/:mediaId/reviews`
- `PUT /reviews/:reviewId`
- `DELETE /reviews/:reviewId`
- `POST /reviews/:reviewId/like`
- `POST /reviews/:reviewId/comments`
- `GET /reviews/:reviewId/comments`

### Watchlist (`/api/watchlist`)

- `GET /`
- `POST /:mediaId`
- `DELETE /:mediaId`

### Purchases (`/api/purchases`)

- `GET /history`
- `GET /` (admin)
- `POST /`
- `POST /:purchaseId/revoke`

### Payments (`/api/payments`)

- `POST /checkout/subscription`
- `GET /checkout/:checkoutId/status`
- `GET /history`
- `POST /webhook/:provider`

## Frontend Checkout Integration (`/card`)

Frontend env (Next.js):

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_USE_REMOTE_API=true
NEXT_PUBLIC_PAYMENT_API_URL=http://localhost:5000/api
```

Supported `paymentMethod` / `paymentMethodType` values:

- `visa`
- `debit_card`
- `credit_card`
- `bkash`
- `nagad`
- `rocket`

Notes:

- `Idempotency-Key` header supported for duplicate checkout protection.
- Card payload is tokenized server-side (PAN/CVV are not persisted).
- Wallet payload must provide `{ provider, number }`.
- Subscription amount is always validated server-side from `plan`.

### Dashboard (`/api/dashboard`)

- `GET /stats`
- `GET /favorites`

### Admin (`/api/admin`)

- `GET /overview`
- `GET /reviews/pending`
- `POST /reviews/:reviewId/approve`
- `POST /reviews/:reviewId/reject`
- `POST /media`

## Postman Quick Start

1. `POST /api/auth/email/signup`
2. `POST /api/auth/email/signin`
3. `token` copy kore Authorization header-e set:
   - `Authorization: Bearer <token>`
4. protected endpoints test:
   - `GET /api/users/me`
   - `GET /api/dashboard/stats`
   - `GET /api/watchlist`

## Known Gaps (Production Scope)

These are not fully production-complete yet:

- Real payment capture/webhook (Stripe/PayPal/Razorpay full flow)
- Real social OAuth provider verification flow
- Email service integration for reset link delivery
- Redis caching and centralized logging pipeline

---

If you want, next step-e ami ei README-r sathe exported Postman collection (`NGV-Backend.postman_collection.json`) o generate kore dite pari.

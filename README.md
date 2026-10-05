# technIEEEks’26 — Phase 3

The Phase 3 Game registration portal for IEEE Graphic Era Hill University Student Branch. The existing editorial and cyber portal designs are preserved at `/` and `/cyber`.

## Run locally

```bash
npm install
npm run dev
```

- **http://localhost:3000/** — Minimal editorial registration portal (screen 1).
- **http://localhost:3000/cyber** — Cyber registration portal (screen 2).
- **http://localhost:3000/admin/login** — Authenticated manual payment review.

## Checks and production

```bash
npm run typecheck
npm run build
npm run start
```

The public routes are statically prerendered. Registration, payment-proof, admin, and PDF routes run on the Node.js runtime. The project uses the Next.js App Router, React, TypeScript, and CSS Modules. Space Grotesk and Inter are served locally through `next/font`; the official IEEE GEHU and GEHU logos and Material Symbols font are local assets.

The event catalog, date filters, details dialogs, schedule tabs, event selection, fee totals, and registration steps remain interactive. Overlapping events cannot be selected together. Registration submits to the server with an actual payment screenshot and stays `PENDING` until an authenticated administrator checks the payment in the bank record. The server stores the private screenshot, appends one row to Google Sheets, and generates a PDF only after approval. Pending and rejected registrations cannot access the PDF endpoint.

Shared event data lives in `lib/events.ts`. Server-rendered page sections live in `components/`; interactive registration components are in `components/registration/`. Server routes and services are in `app/api/`, `app/pdf/`, and `lib/server/`.

## Configuration

Copy `.env.example` to `.env.local` and set every production value. Do not use `NEXT_PUBLIC_` variables for credentials.

```bash
cp .env.example .env.local
npm run admin:password -- 'use-a-long-random-password'
```

Set the printed `ADMIN_PASSWORD_HASH`, a 32-byte-or-longer `SESSION_SECRET`, the real HTTPS `APP_URL`, the real organizer UPI recipient, and the Google service-account values. Share the Google Sheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as an Editor and keep the tab named `Registrations` with the exact header row defined in `lib/server/googleSheets.ts`.

`PRIVATE_STORAGE_DIR` must be on persistent server storage and outside `public/`. Screenshots are decoded and normalized to private PNG files. The API never exposes the storage path; the proof route requires the participant’s signed HttpOnly cookie or the admin session.

## Checks

```bash
npm run typecheck
npm test
npm run build
npm run check:google
```

`npm test` includes the 14 backend security and workflow tests. Live Google Sheets verification requires the configured service account and sheet; without those values the application fails closed and reports that registration persistence is unavailable.

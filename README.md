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

Set the printed `ADMIN_PASSWORD_HASH`, a 32-byte-or-longer `SESSION_SECRET`, the real HTTPS `APP_URL`, the real organizer UPI recipient, and the Google service-account values. `NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL` is an optional public override; when it is omitted, the application uses the official TECHNIEEEKS’26 community URL bundled in `lib/whatsapp.ts`. Any configured override must be an HTTPS invitation URL whose host is exactly `chat.whatsapp.com`; an invalid override hides the button while keeping the explanatory community section. Set the variable before `next build` when changing the URL. Share the Google Sheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as an Editor and keep the tab named `Registrations` with the exact header row defined in `lib/server/googleSheets.ts`.

`PRIVATE_STORAGE_DIR` must be explicitly set in production to a durable, writable server volume and must be outside `public/`. The application rejects registrations with a controlled `503` before writing a Google Sheets row when persistent private storage is missing or unavailable. Screenshots are decoded and normalized to private PNG files. The API never exposes the storage path; the proof route requires the participant’s signed HttpOnly cookie or the admin session. Serverless/ephemeral filesystems are unsupported unless a durable private storage service or mounted volume is provided.

On `http://localhost`, production `GOOGLE_*` and `PRIVATE_STORAGE_DIR` values are ignored. Local registration storage must use an absolute `LOCAL_PRIVATE_STORAGE_DIR`. Google Sheets access is disabled unless a dedicated development sheet is explicitly approved with `ALLOW_LOCAL_GOOGLE_WRITES=true`, `LOCAL_GOOGLE_SHEET_ID`, `LOCAL_GOOGLE_SHEET_NAME`, `LOCAL_GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `LOCAL_GOOGLE_PRIVATE_KEY`. Without that configuration, use the isolated mocked Google transport in the test suite; localhost will not read or write production registrations.

## Checks

```bash
npm run typecheck
npm test
npm run build
npm run check:google
```

`npm test` includes the backend security, workflow, and Google diagnostic tests. `npm run check:google` performs a read-only Google authentication, spreadsheet metadata, tab, and header/data access check; it never creates a registration or repairs headers. Its JSON output reports only redacted diagnostics. Live Google Sheets verification requires the configured service account and sheet; without those values the application fails closed and reports that registration persistence is unavailable.

Local `npm run check:google` runs load `.env.local` and other local environment files with Next.js's `@next/env` loader before reading configuration, preserving Next.js precedence (existing shell variables win). With `NODE_ENV=production`, the command uses only injected environment variables and does not read local env files. Output is limited to configuration/key booleans, authentication state, and error types/status codes; identifiers and credential values are omitted.

For Railway, `GOOGLE_PRIVATE_KEY` may contain a PEM key with actual line breaks, literal `\n` escape sequences, or one surrounding pair of single/double quotes. The server normalizes those forms, verifies the PEM without logging key material, and reports only safe booleans such as marker presence and parseability in `npm run check:google` or Google failure logs.

# MiniLedger

**Lending made a little simpler.**

MiniLedger is a personal lending companion. It keeps track of the money you've lent to friends: who owes you, how much, when it's due, and what's been paid back. No spreadsheets, no remembering.

> A little more clarity. A lot less remembering.

---

## Features

### Lending
- **Add a loan:** borrower name, amount and due date.
- **Mark as repaid** when a friend pays you back.
- **Archive** settled or old loans to keep the main list clean, and **restore** them any time.
- **Search** loans by borrower.
- **Overdue detection:** pending loans past their due date are flagged automatically.

### Dashboard
- **Lending snapshot:** total lent, total repaid and the overdue amount at a glance.
- **Recent activity** and a full **All Activity** list (newest first).
- **Quick access** to borrowers, due reminders, loan reports and archived loans.
- **Notifications** for loans that need attention.

### Account
- **Phone-first sign up and sign in.** No passwords.
- **Verified email** during registration.
- **Edit profile** (name, email).
- Sessions stay signed in securely and refresh automatically.

---

## How sign-in works

```
Register:  name + email + phone ─▶ verify phone (Phone.Email) ─▶ verify email (6-digit code) ─▶ signed in
Login:     phone ─▶ verify phone (Phone.Email) ─▶ signed in
```

- **Phone verification** is done through [Phone.Email](https://www.phone.email/) inside an in-app WebView. The backend verifies the signed token it returns and checks that the verified number matches the one the user typed.
- **Email codes** are 6 digits, expire after **5 minutes**, can be resent after **30 seconds**, and lock after **5 wrong attempts**. Codes are stored only as HMAC hashes, never in plain text.
- **Tokens:** a short-lived **access token (15 min, JWT)** and a **refresh token (7 days)**. Refresh tokens are stored hashed in the database and can be revoked on logout. On the phone, tokens live in **Expo SecureStore** (Keychain / Keystore).

---

## Tech stack

| Layer | Tech |
|---|---|
| Mobile | Expo SDK 58, React Native 0.88, React 19, TypeScript |
| Mobile libraries | axios, expo-secure-store, expo-application, react-native-webview, react-native-country-picker-modal, react-native-safe-area-context |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL 16 with Drizzle ORM and drizzle-kit migrations |
| Validation | Zod |
| Auth | JWT (jsonwebtoken), hashed refresh tokens, Phone.Email, email OTP |
| Email | Brevo transactional email API |
| Tests | Vitest and Supertest |

---

## Project structure

```
projectHelper/
├── backend/
│   ├── src/
│   │   ├── index.ts                  # server start + graceful shutdown
│   │   ├── app.ts                    # Express app, routes, error handling
│   │   ├── db/
│   │   │   ├── index.ts              # Drizzle + pg connection
│   │   │   └── schema.ts             # tables and enums
│   │   ├── common/
│   │   │   ├── middleware/           # validation, error handler
│   │   │   └── utils/                # AppError, asyncHandler
│   │   └── modules/
│   │       ├── auth/                 # phone + email verification, tokens, profile
│   │       ├── loans/                # create, list, repay, archive, restore
│   │       └── dashboard/            # summary totals
│   ├── drizzle/                      # SQL migrations
│   ├── drizzle.config.ts
│   └── docker-compose.yml            # local Postgres
└── mobile/
    ├── App.tsx                       # screen flow and auth state
    └── src/
        ├── api/                      # axios client, auth + ledger API, token storage
        └── screens/
            ├── WelcomeScreen.tsx
            ├── RegisterScreen.tsx
            ├── LoginScreen.tsx
            ├── PhoneEmailScreen.tsx  # phone verification (WebView)
            ├── OtpScreen.tsx         # email code entry
            └── HomeScreen.tsx        # dashboard, loans, profile, settings
```

---

## Data model

| Table | Purpose | Key fields |
|---|---|---|
| `users` | Registered accounts | `phone` (unique), `name`, `email` (unique), `email_verified_at` |
| `registration_challenges` | Sign-ups waiting for email verification | `phone`, `name`, `email`, `email_otp_hash`, `email_otp_expires_at`, `email_otp_attempts` |
| `loans` | Money lent to a friend | `user_id`, `friend_name`, `amount` (12,2), `due_date`, `status` (`pending` / `repaid`), `repaid_at`, `archived_at` |
| `repayments` | Repayment history | `loan_id`, `amount`, `repaid_at` |
| `refresh_tokens` | Active sessions | `user_id`, `token_hash`, `expires_at`, `revoked_at` |

Deleting a user cascades to their loans, repayments and sessions.

---

## API

Base URL: `/api`. Endpoints marked 🔒 need `Authorization: Bearer <accessToken>`.

### Health
| Method | Path | Description |
|---|---|---|
| GET | `/health` | Service status |

### Auth: `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/phone-email/verify` | Verify the Phone.Email token. `mode: "login"` returns tokens; `mode: "register"` starts email verification |
| POST | `/request-email-otp` | Send (or resend) the 6-digit email code |
| POST | `/verify-email-otp` | Verify the email code, create the account and return tokens |
| POST | `/refresh` | Exchange a refresh token for a new access token |
| POST | `/logout` | Revoke the refresh token |
| PATCH | `/profile` 🔒 | Update name / email |

### Loans: `/api/loans`
| Method | Path | Description |
|---|---|---|
| POST | `/` 🔒 | Create a loan |
| GET | `/` 🔒 | List active (non-archived) loans |
| GET | `/archived` 🔒 | List archived loans |
| PATCH | `/:id/repay` 🔒 | Mark a loan as repaid |
| PATCH | `/:id/archive` 🔒 | Archive a loan |
| PATCH | `/:id/restore` 🔒 | Restore an archived loan |

### Dashboard: `/api/dashboard`
| Method | Path | Description |
|---|---|---|
| GET | `/summary` 🔒 | `totalLent`, `totalRepaid`, `overdueAmount` (archived loans excluded) |

**Response shape:** errors return `{ "success": false, "message": "..." }` with a matching HTTP status (400, 401, 404, 409 and so on).

---

## Getting started (local)

### Prerequisites
- Node.js 22+
- Docker (for Postgres)
- Expo Go or a development build on your phone. `react-native-webview` and `expo-secure-store` are native modules, so a development build is recommended.

### Backend
```bash
cd backend
docker compose up -d          # Postgres on localhost:5433
# create .env (see below)
npm ci
npm run db:migrate
npm run dev                   # http://localhost:8000/api/health
```

### Mobile
```bash
cd mobile
npm ci
npx expo start
```
Set `API_BASE_URL` in `mobile/src/api/client.ts` to your computer's LAN IP, e.g. `http://192.168.1.6:8000/api`.

### Environment variables (`backend/.env`)
| Variable | Description |
|---|---|
| `PORT` | API port, e.g. `8000` |
| `DATABASE_URL` | `postgresql://miniledger:<password>@localhost:5433/miniledger` |
| `JWT_SECRET` | Random secret for signing access tokens |
| `EMAIL_OTP_SECRET` | Random secret for hashing email codes |
| `BREVO_API_KEY` | Brevo API key |
| `BREVO_SENDER_EMAIL` | Verified Brevo sender address |
| `BREVO_SENDER_NAME` | Display name, default `MiniLedger` |
| `PHONE_EMAIL_API_KEY` | Phone.Email API key |

Generate secrets with `openssl rand -hex 32`. Never commit `.env`.

---

## Scripts

### Backend
| Command | What it does |
|---|---|
| `npm run dev` | Start with hot reload (tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | Type-check only |
| `npm run db:generate` | Generate a migration from `schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Open Drizzle Studio |

### Mobile
| Command | What it does |
|---|---|
| `npx expo start` | Start the dev server |
| `npx expo run:android` / `run:ios` | Build and run a development build |
| `npx tsc --noEmit` | Type-check |

---

## Security notes
- No passwords are stored. Identity comes from a verified phone number and email.
- OTPs and refresh tokens are stored only as hashes.
- Every loan and dashboard query is scoped to the signed-in user.
- Input is validated with Zod before it reaches a service.
- Error responses never include secrets, OTPs or tokens.

---

## Roadmap ideas
- Partial repayments (the `repayments` table is already in place)
- Due-date push reminders
- Export loan reports (PDF / CSV)
- Multiple currencies

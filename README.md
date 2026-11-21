# Advanced Authentication (MERN)

A practice project for building an authentication and account-management application with a React client, an Express API, and MongoDB.

The repository is being actively repaired and refactored. Some authentication flows and API contracts are currently incomplete or inconsistent, so the feature list below describes the project's intended scope rather than a claim that every flow is production-ready.

## Project scope

- Email and password registration and login
- Google OAuth sign-in
- User profile management
- Email verification and password reset
- Device-aware login verification (two-factor-style flow)
- Role-based access for subscribers, authors, and administrators
- Administrative user management

## Technology

| Area | Technology |
| --- | --- |
| Frontend | React 18, Vite, React Router, Dart Sass |
| State management | Redux Toolkit, React Redux |
| HTTP client | Axios |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Tokens, HTTP-only cookies, bcrypt |
| Email | Nodemailer and Handlebars templates |
| OAuth | Google OAuth client |

## Repository layout

```text
.
├── backend/
│   ├── controllers/       # Request handlers
│   ├── middleware/        # Authentication and error handling
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── utils/             # Shared backend utilities
│   └── views/             # Email templates
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── public/
    └── src/
        ├── components/
        ├── pages/
        └── redux/
```

## Prerequisites

- Node.js 22.12 or newer for both the backend and frontend.
- A MongoDB database, local or hosted.
- Google OAuth credentials if Google sign-in is enabled.
- SMTP credentials if email-based flows are enabled.

> **Frontend tooling:** The frontend now uses Vite and Dart Sass. Keep Node.js at version 22.12 or newer to satisfy the Vite/Vitest toolchain.

## Configuration

Copy `backend/.env.example` to `backend/.env` and configure the values for your environment:

| Variable | Purpose |
| --- | --- |
| `PORT` | API server port (defaults to `5000`) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign and verify session JWTs |
| `JWT_EXPIRES_IN` | Optional JWT lifetime; defaults to `1d` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `EMAIL_HOST` | SMTP host |
| `EMAIL_USER` | SMTP username / sender account |
| `EMAIL_PASS` | SMTP password |
| `FRONTEND_URL` | Public frontend origin, used to create email links and as the default CORS origin |
| `CORS_ORIGINS` | Optional comma-separated list of allowed frontend origins |
| `TRUST_PROXY` | Set to `true` only when the API is behind one trusted reverse proxy |
| `EMAIL_PORT` | Optional SMTP port; defaults to `587` |
| `EMAIL_REPLY_TO` | Optional reply-to email address; defaults to `EMAIL_USER` |

Copy `frontend/.env.example` to `frontend/.env`:

| Variable | Purpose |
| --- | --- |
| `VITE_BACKEND_URL` | Backend origin, without the `/api/users` path |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID used by the frontend |
| `VITE_CLOUD_NAME` | Cloudinary cloud name used for profile image uploads |
| `VITE_UPLOAD_PRESET` | Cloudinary unsigned upload preset used for profile image uploads |

Never commit real credentials, tokens, database URLs, or populated environment files. Use separate credentials for development and deployment.

## Run locally

Install and run the backend:

```bash
cd backend
npm ci
npm start
```

The API defaults to port `5000`.

In a second terminal, install and run the frontend:

```bash
cd frontend
npm ci
npm start
```

The Vite development server normally runs on port `3000`. Set `VITE_BACKEND_URL` to the backend origin and ensure the backend CORS allowlist contains the frontend origin. Frontend CI uses Node.js 22 and the committed lockfile.

Use `npm ci` instead of `npm install` when installing from a committed lockfile in a reproducible environment.

## Available scripts

### Backend

| Command | Description |
| --- | --- |
| `npm start` | Start the Express server |
| `npm run backend` | Restart the server automatically when files change (Node.js watch mode) |

### Frontend

| Command | Description |
| --- | --- |
| `npm start` or `npm run dev` | Start the Vite development server |
| `npm test` | Run Vitest unit tests |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |

## Security notes

- Session cookies should remain `HttpOnly`, and production cookies must use secure transport.
- Keep JWT, OAuth, SMTP, encryption, and database secrets outside source control.
- Do not expose password hashes, reset tokens, verification tokens, or device codes in API responses or logs.
- Apply server-side authorization and input validation to every protected operation; frontend route guards are not security boundaries.
- Authentication, OTP, verification, and password-reset endpoints have per-IP rate limits; OTP and email flows also enforce per-account cooldowns.
- The default rate-limit store is in-memory and is suitable for a single application instance. Use a shared store such as Redis before running multiple API instances.
- Review [SECURITY.md](SECURITY.md) for vulnerability reporting instructions.

## Project status

This is a learning and portfolio project undergoing a staged refactor. The data model, backend dependencies, authentication and token lifecycle, API contracts, authorization, email handling, and core frontend flows have been repaired in focused pull requests. Backend startup/unit checks and frontend install/test/build workflows run in GitHub Actions. Database-backed integration tests remain outstanding. The frontend Vite migration and non-breaking dependency remediation are being validated in a dedicated pull request.

Do not deploy the current `main` branch as a production authentication service until the security fixes, integration tests, and deployment configuration have been completed.

## Contributing

Keep changes focused and reviewable. Prefer small branches and pull requests grouped by responsibility. Add or update tests for behavior changes, and do not include secrets or generated dependency folders in commits.

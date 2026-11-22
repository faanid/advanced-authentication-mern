# Advanced Authentication (MERN)

A learning and portfolio project for an authentication and account-management application built with a React client, an Express API, and MongoDB.

The project implements the core authentication flows described below and is maintained through focused refactors and automated checks. It is intended for education and demonstration, not as a production-ready identity provider.

## Project scope

- Email and password registration and login
- Google OAuth sign-in
- User profile management
- Email verification and password reset
- New-device login verification using one-time codes
- Role-based access for subscribers, authors, administrators, and suspended accounts
- Administrative user management
- Session revocation after logout, password changes, and role changes

## Technology

| Area | Technology |
| --- | --- |
| Frontend | React 18, Vite, React Router, Dart Sass |
| State management | Redux Toolkit, React Redux |
| HTTP client | Axios |
| Backend | Node.js 22+, Express |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Tokens, HTTP-only cookies, bcrypt |
| Email | Nodemailer and Handlebars templates |
| OAuth | Google OAuth client |
| Testing | Vitest, Node.js Test Runner, MongoDB integration tests |

## Repository layout

\x60\x60\x60text
.
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── emailController.js
│   │   ├── profileController.js
│   │   └── adminController.js
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── tests/
│   ├── utils/
│   └── views/
└── frontend/
    ├── public/
    ├── index.html
    ├── vite.config.mjs
    └── src/
        ├── components/
        ├── hooks/
        ├── pages/
        ├── redux/
        │   ├── api/
        │   └── features/
        │       ├── auth/
        │       ├── email/
        │       └── users/
        └── utils/
\x60\x60\x60

\x60backend/controllers/userController.js\x60 is a compatibility barrel that re-exports the domain-specific controllers for the existing route definitions.

## Prerequisites

- Node.js 22.12 or newer.
- A MongoDB database, local or hosted.
- Google OAuth credentials if Google sign-in is enabled.
- SMTP credentials if email-based flows are enabled.
- Cloudinary credentials if profile image uploads are enabled.

## Configuration

Copy \x60backend/.env.example\x60 to \x60backend/.env\x60 and configure the values for your environment:

| Variable | Purpose |
| --- | --- |
| \x60PORT\x60 | API server port (defaults to \x605000\x60) |
| \x60MONGO_URI\x60 | MongoDB connection string |
| \x60JWT_SECRET\x60 | Strong secret used to sign and verify session JWTs |
| \x60JWT_EXPIRES_IN\x60 | Optional JWT lifetime; defaults to \x601d\x60. The session cookie uses the same lifetime. |
| \x60GOOGLE_CLIENT_ID\x60 | Google OAuth client ID |
| \x60EMAIL_HOST\x60 | SMTP host |
| \x60EMAIL_USER\x60 | SMTP username and sender account |
| \x60EMAIL_PASS\x60 | SMTP password |
| \x60EMAIL_PORT\x60 | Optional SMTP port; defaults to \x60587\x60 |
| \x60EMAIL_REPLY_TO\x60 | Optional reply-to address; defaults to \x60EMAIL_USER\x60 |
| \x60FRONTEND_URL\x60 | Frontend origin used for email links and as the default CORS origin |
| \x60CORS_ORIGINS\x60 | Optional comma-separated list of allowed frontend origins |
| \x60TRUST_PROXY\x60 | Set to \x60true\x60 only when the API is behind one trusted reverse proxy |

Copy \x60frontend/.env.example\x60 to \x60frontend/.env\x60:

| Variable | Purpose |
| --- | --- |
| \x60VITE_BACKEND_URL\x60 | Backend origin, without the \x60/api/users\x60 path |
| \x60VITE_GOOGLE_CLIENT_ID\x60 | Google OAuth client ID used by the frontend |
| \x60VITE_CLOUD_NAME\x60 | Cloudinary cloud name for profile image uploads |
| \x60VITE_UPLOAD_PRESET\x60 | Cloudinary unsigned upload preset for profile image uploads |

Values prefixed with \x60VITE_\x60 are included in the browser bundle and are public. Never put private keys, passwords, API secrets, or database credentials in frontend environment variables.

Generate a strong JWT secret rather than reusing a password. Keep all populated environment files out of source control and use separate credentials for development and deployment.

## Run locally

Install and run the backend:

\x60\x60\x60bash
cd backend
npm ci
npm start
\x60\x60\x60

The API defaults to port \x605000\x60.

In a second terminal, install and run the frontend:

\x60\x60\x60bash
cd frontend
npm ci
npm run dev
\x60\x60\x60

The Vite development server normally runs on port \x603000\x60. Set \x60VITE_BACKEND_URL\x60 to the backend origin and ensure the backend CORS allowlist includes the frontend origin.

Use \x60npm ci\x60 when installing from the committed lockfiles to get reproducible dependency versions.

## Available scripts

### Backend

| Command | Description |
| --- | --- |
| \x60npm start\x60 | Start the Express server |
| \x60npm run backend\x60 | Restart the server automatically when files change |
| \x60npm test\x60 | Run unit and MongoDB-backed integration tests |
| \x60npm run audit\x60 | Audit backend dependencies for high-severity vulnerabilities |

### Frontend

| Command | Description |
| --- | --- |
| \x60npm start\x60 or \x60npm run dev\x60 | Start the Vite development server |
| \x60npm test\x60 | Run Vitest unit tests |
| \x60npm run build\x60 | Create a production build in \x60dist/\x60 |
| \x60npm run preview\x60 | Preview the production build locally |

## Security notes

- Session cookies are \x60HttpOnly\x60; production cookies use \x60Secure\x60 and \x60SameSite=None\x60.
- JWT expiry and cookie lifetime are configured together through \x60JWT_EXPIRES_IN\x60.
- Passwords are hashed with bcrypt and constrained to bcrypt's 72-byte input limit.
- Keep JWT, OAuth, SMTP, and database secrets outside source control.
- Do not expose password hashes, reset tokens, verification tokens, or device codes in API responses or logs.
- Authorization and input validation are enforced on the API; frontend route guards are not security boundaries.
- Authentication, OTP, verification, and password-reset endpoints have per-IP rate limits. OTP and email-token flows also enforce per-account cooldowns.
- The default rate-limit store is in-memory and is suitable for a single API instance. Use a shared store such as Redis before deploying multiple instances.
- Review [SECURITY.md](SECURITY.md) for vulnerability reporting instructions.

## Project status and limitations

The current development branch includes the staged backend and frontend refactors, MongoDB-backed account/session tests, frontend unit tests, dependency audits, and production build checks in GitHub Actions.

Live SMTP delivery and Google OAuth provider behavior still depend on external credentials and should be tested in a dedicated staging environment. The default in-memory rate limiter is not suitable for horizontally scaled production deployments. A production deployment also requires an explicit threat model, monitoring, secret management, HTTPS, database backups, and a review of the hosting and CORS configuration.

Do not deploy this learning project as a production authentication service without those additional controls and an independent security review.

## Contributing

Keep changes focused and reviewable. Prefer small branches and pull requests grouped by responsibility. Add or update tests for behavior changes, and never commit secrets, generated build output, or dependency folders.

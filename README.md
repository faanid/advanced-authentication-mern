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
| Frontend | React 18, React Router, Sass |
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
    ├── public/
    └── src/
        ├── components/
        ├── pages/
        └── redux/
```

## Prerequisites

- Node.js and npm versions compatible with the dependencies in each package.
- A MongoDB database, local or hosted.
- Google OAuth credentials if Google sign-in is enabled.
- SMTP credentials if email-based flows are enabled.

> **Legacy dependency note:** The frontend currently uses Create React App and `node-sass`. Check their Node.js compatibility before installing dependencies. The frontend toolchain should be modernized as part of the planned maintenance work before production use.

## Configuration

Create a `.env` file inside `backend/` and configure the variables required by the backend:

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
| `EMAIL_PORT` | Optional SMTP port; defaults to `587` |
| `EMAIL_REPLY_TO` | Optional reply-to email address; defaults to `EMAIL_USER` |

Create a `.env` file inside `frontend/`:

| Variable | Purpose |
| --- | --- |
| `REACT_APP_BACKEND_URL` | Backend origin, without the `/api/users` path |
| `REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth client ID used by the frontend |
| `REACT_APP_CLOUD_NAME` | Cloudinary cloud name used for profile image uploads |
| `REACT_APP_UPLOAD_PRESET` | Cloudinary unsigned upload preset used for profile image uploads |

Never commit real credentials, tokens, database URLs, or populated environment files. Use separate credentials for development and deployment.

## Run locally

Install and run the backend:

```bash
cd backend
npm install
npm start
```

The API defaults to port `5000`.

In a second terminal, install and run the frontend:

```bash
cd frontend
npm install
npm start
```

The Create React App development server normally runs on port `3000`. Set `REACT_APP_BACKEND_URL` to the backend origin and ensure the backend CORS allowlist contains the frontend origin.

Use `npm ci` instead of `npm install` when installing from a committed lockfile in a reproducible environment.

## Available scripts

### Backend

| Command | Description |
| --- | --- |
| `npm start` | Start the Express server |
| `npm run backend` | Start the server with nodemon |

### Frontend

| Command | Description |
| --- | --- |
| `npm start` | Start the development server |
| `npm test` | Run the Create React App test runner |
| `npm run build` | Create a production build |

## Security notes

- Session cookies should remain `HttpOnly`, and production cookies must use secure transport.
- Keep JWT, OAuth, SMTP, encryption, and database secrets outside source control.
- Do not expose password hashes, reset tokens, verification tokens, or device codes in API responses or logs.
- Apply server-side authorization and input validation to every protected operation; frontend route guards are not security boundaries.
- Configure rate limits for authentication, verification, and password-reset endpoints before deployment.
- Review [SECURITY.md](SECURITY.md) for vulnerability reporting instructions.

## Project status

This is a learning and portfolio project undergoing a staged refactor. The immediate work focuses on repairing the data model, backend startup dependencies, authentication and token lifecycle, API contracts, authorization, email handling, and frontend integration. Automated tests and CI are also planned.

Do not deploy the current `main` branch as a production authentication service until the security fixes, integration tests, and deployment configuration have been completed.

## Contributing

Keep changes focused and reviewable. Prefer small branches and pull requests grouped by responsibility. Add or update tests for behavior changes, and do not include secrets or generated dependency folders in commits.

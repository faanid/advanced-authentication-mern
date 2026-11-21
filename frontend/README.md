# Frontend

The client is a React 18 single-page application built with Vite, React Router, Redux Toolkit, and Dart Sass.

## Requirements

- Node.js 22.12 or newer
- npm

## Setup

```bash
npm ci
cp .env.example .env
npm run dev
```

The development server runs at `http://localhost:3000`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm start` | Alias for the development server |
| `npm test` | Run unit tests with Vitest |
| `npm run build` | Build the production app into `dist/` |
| `npm run preview` | Preview the production build |

## Environment

| Variable | Purpose |
| --- | --- |
| `VITE_BACKEND_URL` | Backend origin, for example `http://localhost:5000` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_CLOUD_NAME` | Cloudinary cloud name |
| `VITE_UPLOAD_PRESET` | Cloudinary unsigned upload preset |

Never put private secrets in Vite environment variables. Values prefixed with `VITE_` are included in the client bundle and are visible to users.

See the repository root [README](../README.md) for backend setup and the complete application guide.

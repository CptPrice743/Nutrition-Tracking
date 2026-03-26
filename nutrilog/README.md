# NutriLog

NutriLog is a personal nutrition tracking web app with a React frontend and an Express + Prisma backend.

## Local Development

- Backend: `cd backend && npm run dev`
- Frontend: `cd frontend && npm run dev`

## Deployment Notes

- Frontend is deployed to Vercel.
- Backend is deployed to Render.
- Configure all environment variables in each platform before deploying.
- Run Prisma migrations on deployment via backend build command.

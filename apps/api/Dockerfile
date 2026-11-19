# Multi-stage build: compile TypeScript in a "build" stage that has dev
# dependencies, then copy only the compiled JS + production dependencies into a
# small runtime image. Build context is the repo root (npm workspaces need the
# root package.json and lockfile).

FROM node:24-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci -w apps/api
COPY apps/api apps/api
RUN npm run build -w apps/api

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci -w apps/api --omit=dev && npm cache clean --force
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY apps/api/migrations apps/api/migrations
WORKDIR /repo/apps/api
# Don't run as root inside the container.
USER node
EXPOSE 3000
# Apply pending migrations, then start. Fine for one instance; with several
# instances you'd run migrations as a separate release step (the advisory lock
# in migrate.ts keeps concurrent runs safe either way).
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]

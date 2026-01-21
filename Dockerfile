# ---- Base deps (monorepo install) ----
FROM node:22-slim AS deps
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable

# Copy workspace manifests first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json

# Install all deps for building (includes dev deps)
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM deps AS build
WORKDIR /app

# Copy the full repo
COPY . .

# Build shared + frontend + backend (root script: pnpm -r build)
RUN pnpm -r build

# Copy frontend build into backend public directory
# (Backend will serve /app/apps/backend/public as static)
RUN rm -rf apps/backend/public && mkdir -p apps/backend/public \
  && cp -R apps/frontend/dist/* apps/backend/public/

# ---- Runtime (production-only) ----
FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PUBLIC_DIR=/app/apps/backend/public

RUN corepack enable

# Copy minimal workspace files needed for installing production deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json

# Install ONLY production deps for backend (and its workspace deps)
RUN pnpm install --prod --frozen-lockfile --filter backend...

# Copy built backend + static files
COPY --from=build /app/apps/backend/dist apps/backend/dist
COPY --from=build /app/apps/backend/public apps/backend/public

# Cloud Run listens on $PORT
EXPOSE 8080

CMD ["node", "apps/backend/dist/server.js"]

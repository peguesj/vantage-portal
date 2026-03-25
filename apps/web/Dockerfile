# =============================================================================
# Stage 1: deps
# Install all workspace dependencies using pnpm with a frozen lockfile.
# The monorepo root is the build context so that workspace packages resolve.
# =============================================================================
FROM node:22-alpine AS deps

# Install pnpm via corepack (matches packageManager in root package.json)
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /repo

# Copy manifests needed for dependency resolution before copying source.
# Order: root workspace files → tooling → packages → app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Tooling (shared tsconfig, eslint, prettier configs)
COPY tooling/ tooling/

# Package manifests only (src copied in builder stage)
COPY packages/ui/package.json              packages/ui/package.json
COPY packages/shared/package.json          packages/shared/package.json
COPY packages/supabase/package.json        packages/supabase/package.json
COPY packages/i18n/package.json            packages/i18n/package.json
COPY packages/next/package.json            packages/next/package.json
COPY packages/admin/package.json           packages/admin/package.json
COPY packages/billing/package.json         packages/billing/package.json
COPY packages/domains/package.json         packages/domains/package.json
COPY packages/scribe/package.json          packages/scribe/package.json
COPY packages/whmcs/package.json           packages/whmcs/package.json
COPY packages/licensing/package.json       packages/licensing/package.json

# Features sub-packages (@kit/accounts, @kit/auth, @kit/support)
COPY packages/features/accounts/package.json   packages/features/accounts/package.json
COPY packages/features/auth/package.json       packages/features/auth/package.json
COPY packages/features/support/package.json    packages/features/support/package.json

# App manifest
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile --ignore-scripts

# =============================================================================
# Stage 2: builder
# Copy full source and build the Next.js app (standalone output).
# =============================================================================
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /repo

# Bring installed node_modules from deps stage
COPY --from=deps /repo/node_modules       ./node_modules
COPY --from=deps /repo/apps/web/node_modules  ./apps/web/node_modules

# Copy full source tree
COPY . .

# Build args for public vars — override at build time
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_PRODUCT_NAME=Vantage
ARG NEXT_PUBLIC_AUTH_PASSWORD=true
ARG NEXT_PUBLIC_AUTH_MAGIC_LINK=false
ARG NEXT_PUBLIC_ENABLE_THEME_TOGGLE=true
ARG NEXT_PUBLIC_LANGUAGE_PRIORITY=application
ARG NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_DELETION=true
ARG NEXT_PUBLIC_DEFAULT_THEME_MODE=light
ARG NEXT_PUBLIC_THEME_COLOR=#ffffff
ARG NEXT_PUBLIC_THEME_COLOR_DARK=#0a0a0a
ARG NEXT_PUBLIC_LOCALES_PATH=apps/web/public/locales

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_PRODUCT_NAME=$NEXT_PUBLIC_PRODUCT_NAME \
    NEXT_PUBLIC_AUTH_PASSWORD=$NEXT_PUBLIC_AUTH_PASSWORD \
    NEXT_PUBLIC_AUTH_MAGIC_LINK=$NEXT_PUBLIC_AUTH_MAGIC_LINK \
    NEXT_PUBLIC_ENABLE_THEME_TOGGLE=$NEXT_PUBLIC_ENABLE_THEME_TOGGLE \
    NEXT_PUBLIC_LANGUAGE_PRIORITY=$NEXT_PUBLIC_LANGUAGE_PRIORITY \
    NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_DELETION=$NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_DELETION \
    NEXT_PUBLIC_DEFAULT_THEME_MODE=$NEXT_PUBLIC_DEFAULT_THEME_MODE \
    NEXT_PUBLIC_THEME_COLOR=$NEXT_PUBLIC_THEME_COLOR \
    NEXT_PUBLIC_THEME_COLOR_DARK=$NEXT_PUBLIC_THEME_COLOR_DARK \
    NEXT_PUBLIC_LOCALES_PATH=$NEXT_PUBLIC_LOCALES_PATH \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_CI=true

WORKDIR /repo/apps/web

RUN pnpm run build

# =============================================================================
# Stage 3: runner
# Minimal Alpine image — only standalone output + static assets.
# =============================================================================
FROM node:22-alpine AS runner

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standalone server bundle
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
# Static assets
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static      ./apps/web/.next/static
# Public directory (locales, images, etc.)
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public             ./apps/web/public

USER nextjs

EXPOSE 3000

# The standalone server.js is placed at the app workspace path inside standalone/
CMD ["node", "apps/web/server.js"]

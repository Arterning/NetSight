# Dockerfile

# Stage 1: Install dependencies
FROM node:20 AS deps
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency definition files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
# RUN apt-get update -y && apt-get install -y openssl
RUN pnpm config set registry https://registry.npmmirror.com && pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM node:20 AS builder
WORKDIR /app

# Copy dependencies from the 'deps' stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma Client Generation
COPY prisma ./prisma/
# RUN apt-get update -y && apt-get install -y openssl
RUN npx prisma generate

# Build the Next.js application
# Pass build-time secrets as ARGs
ARG OPENAI_API_KEY
ARG OPENAI_BASE_URL
RUN npm run build

# Stage 3: Production image
FROM node:20
WORKDIR /app

# Set environment to production
ENV NODE_ENV production

# 安装 Chromium 依赖（系统库、字体等）
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm-dev \
    libxkbcommon-dev \
    libgbm-dev \
    libasound-dev \
    libpangocairo-1.0-0 \
    libx11-xcb1 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
# RUN addgroup --system --gid 1001 nextjs
# RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set the user
USER root

# Expose the port
EXPOSE 3000

# Set default runtime environment variables.
# These can be overridden by docker-compose.yml or `docker run -e`
ENV PORT=3000
ENV OPENAI_API_KEY=""
ENV OPENAI_BASE_URL=""

# Start the server
CMD ["npm", "start-docker"]

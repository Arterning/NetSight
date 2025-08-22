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

RUN npm install -g pnpm
COPY --from=deps /app/node_modules ./node_modules
RUN npx puppeteer browsers install chrome

# Create a non-root user for security
# RUN addgroup --system --gid 1001 nextjs
# RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY scripts /app/
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

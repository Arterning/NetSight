# Dockerfile

# Stage 1: Install dependencies
FROM node:20-slim AS deps
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency definition files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM node:20-slim AS builder
WORKDIR /app

# Copy dependencies from the 'deps' stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma Client Generation
COPY prisma ./prisma/
RUN npx prisma generate

# Build the Next.js application
# Pass build-time secrets as ARGs
ARG OPENAI_API_KEY
ARG OPENAI_BASE_URL
RUN pnpm run build

# Stage 3: Production image
FROM node:20-slim AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV production

# Create a non-root user for security
RUN addgroup --system --gid 1001 nextjs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

# Set the user
USER nextjs

# Expose the port
EXPOSE 3000

# Set default runtime environment variables.
# These can be overridden by docker-compose.yml or `docker run -e`
ENV PORT=3000
ENV OPENAI_API_KEY=""
ENV OPENAI_BASE_URL=""

# Start the server
CMD ["node", "server.js"]

## Multi-stage Dockerfile for klown-accessories-store
# Build stage: install dev deps and build the Vite frontend
FROM node:18-alpine AS build
WORKDIR /app

# Install dependencies (full install required to build)
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy source and build frontend
COPY . .
RUN npm run build

# Production stage: run the Express server and serve built assets
FROM node:18-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --only=production

# Copy built frontend and server code
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/src ./src

# Copy other necessary files (data, docs)
COPY --from=build /app/src/data ./src/data
COPY --from=build /app/docs ./docs

EXPOSE 3001

CMD ["node", "server.js"]

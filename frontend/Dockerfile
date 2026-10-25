# Multi-stage Dockerfile for WindWise React Frontend

# Stage 1: Build the Vite production bundle
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build production assets into /app/dist
RUN npm run build

# Stage 2: Serve production assets via Nginx
FROM nginx:alpine

# Remove default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built static files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

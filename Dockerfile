FROM node:20-alpine AS base
WORKDIR /app

FROM base AS backend-deps
COPY backend/package*.json ./
RUN npm ci --only=production

FROM base AS backend-build
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npx prisma generate
RUN npm run build

FROM base AS backend
COPY --from=backend-deps /app/node_modules ./node_modules
COPY --from=backend-build /app/dist ./dist
COPY --from=backend-build /app/prisma ./prisma
COPY --from=backend-build /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 5000
CMD ["node", "dist/index.js"]

FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM nginx:alpine AS frontend
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

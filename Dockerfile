# ---------- Etapa 1: build de Angular ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# URL pública del backend, ej. https://roomix-api.up.railway.app/api
ARG API_URL
ENV API_URL=${API_URL}
RUN npm run build

# ---------- Etapa 2: servidor estático ----------
FROM nginx:1.27-alpine
# La imagen oficial sustituye ${PORT} en /etc/nginx/templates/*.template al arrancar
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/roomix/browser /usr/share/nginx/html
ENV PORT=80
EXPOSE 80

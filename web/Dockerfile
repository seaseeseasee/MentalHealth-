FROM node:24-slim AS build
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY shared /app/shared
COPY web ./
RUN npm run build

FROM nginx:1.27-alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html
EXPOSE 80

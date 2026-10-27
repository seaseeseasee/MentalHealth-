FROM node:24-slim
WORKDIR /app/api
COPY api/package*.json ./
RUN npm ci --omit=dev
COPY shared /app/shared
COPY api/src ./src
RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production PORT=3000
USER node
EXPOSE 3000
CMD ["node", "--disable-warning=ExperimentalWarning", "src/server.ts"]

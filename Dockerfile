FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATABASE_PATH=/data/common.sqlite
COPY --from=build /app /app
RUN mkdir -p /data
VOLUME /data
EXPOSE 3000
CMD ["node", "server/index.mjs", "--production"]

FROM node:24-alpine AS build
WORKDIR /app
ENV HUSKY=0 \
    CI=true
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build && pnpm prune --prod --ignore-scripts

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    FERRLABS_MCP_MODE=http \
    PORT=3000 \
    HOST=0.0.0.0
COPY --from=build --chown=1000:1000 /app/node_modules ./node_modules
COPY --from=build --chown=1000:1000 /app/dist ./dist
COPY --from=build --chown=1000:1000 /app/package.json ./
USER 1000:1000
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "dist/index.js"]

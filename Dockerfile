ARG PACKAGE=@ferrlabs/mcp

FROM node:24-alpine AS build
ARG PACKAGE
WORKDIR /app
ENV HUSKY=0 \
    CI=true
RUN corepack enable
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/mcp-core/package.json packages/mcp-core/
COPY packages/mcp/package.json packages/mcp/
COPY packages/ferrvault-mcp/package.json packages/ferrvault-mcp/
COPY packages/ferrtrack-mcp/package.json packages/ferrtrack-mcp/
COPY packages/ferrgrowth-mcp/package.json packages/ferrgrowth-mcp/
COPY packages/ferrfleet-mcp/package.json packages/ferrfleet-mcp/
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY packages/mcp-core packages/mcp-core
COPY packages/mcp packages/mcp
COPY packages/ferrvault-mcp packages/ferrvault-mcp
COPY packages/ferrtrack-mcp packages/ferrtrack-mcp
COPY packages/ferrgrowth-mcp packages/ferrgrowth-mcp
COPY packages/ferrfleet-mcp packages/ferrfleet-mcp
RUN pnpm run build
RUN pnpm --filter "${PACKAGE}" deploy --prod --legacy /out

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    FERRLABS_MCP_MODE=http \
    PORT=3000 \
    HOST=0.0.0.0
COPY --from=build --chown=1000:1000 /out/node_modules ./node_modules
COPY --from=build --chown=1000:1000 /out/dist ./dist
COPY --from=build --chown=1000:1000 /out/package.json ./
USER 1000:1000
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "dist/index.js"]

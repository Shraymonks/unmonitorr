FROM node:22.16.0-alpine AS build
RUN corepack enable
USER node
WORKDIR /usr/src/app/
COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY --chown=node:node tsconfig.json .
COPY --chown=node:node src/ src/
RUN pnpm build
RUN pnpm prune --production

FROM node:22.16.0-alpine
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init curl
USER node
WORKDIR /usr/src/app/
COPY --chown=node:node --from=build /usr/src/app/dist ./dist
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/package.json ./package.json
EXPOSE 9797 9898
HEALTHCHECK --timeout=3s --start-period=5s CMD curl --fail http://localhost:9797/healthz || curl --fail http://localhost:9898/healthz || exit 1
ENTRYPOINT [ "dumb-init", "node", "dist/index.js" ]

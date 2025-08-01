FROM node:22.18.0-alpine
ENV NODE_ENV=production
RUN corepack enable && apk add --no-cache dumb-init curl
USER node
WORKDIR /usr/src/app/
COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --chown=node:node tsconfig.json .
COPY --chown=node:node src/ src/
EXPOSE 9797
HEALTHCHECK --timeout=3s --start-period=5s CMD curl --fail http://localhost:9797/healthz || exit 1
ENTRYPOINT [ "dumb-init", "node", "src/index.ts" ]

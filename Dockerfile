FROM node:22.16.0-alpine AS build
RUN npm install -g pnpm
USER node
WORKDIR /usr/src/app/
COPY --chown=node:node tsconfig.json .
COPY --chown=node:node package.json pnpm-lock.yaml .
RUN pnpm install
COPY --chown=node:node src/ src/
RUN pnpm build

FROM node:22.16.0-alpine AS deps
ENV NODE_ENV=production
RUN npm install -g pnpm
USER node
WORKDIR /usr/src/app/
COPY --chown=node:node package.json pnpm-lock.yaml .
RUN pnpm install --ignore-scripts

FROM node:22.16.0-alpine
ENV NODE_ENV=production
RUN apk add --update dumb-init
USER node
WORKDIR /usr/src/app/
COPY --chown=node:node --from=build /usr/src/app/package.json .
COPY --chown=node:node --from=deps /usr/src/app/node_modules/ node_modules/
COPY --chown=node:node --from=build /usr/src/app/dist/ dist/
EXPOSE 9797 9898
ENTRYPOINT [ "dumb-init", "node", "dist/index.js" ]

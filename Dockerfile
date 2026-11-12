FROM node:lts

ENV NODE_ENV=production
WORKDIR /app

# Copy manifests first so dependency installation can use Docker layer caching.
COPY package*.json ./
RUN npm install --omit=dev

COPY --chown=node:node . .
RUN npm run build && chown -R node:node /app/dist

USER node
EXPOSE 3000
CMD ["node", "index.js"]

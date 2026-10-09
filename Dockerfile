FROM node:22-alpine
WORKDIR /app
COPY package.json index.html ./
COPY src ./src
COPY scripts ./scripts
COPY server ./server
COPY public ./public
RUN npm run build && mkdir -p /app/data && chown -R node:node /app
USER node
ENV NODE_ENV=production SERVE_DIST=1 HOST=0.0.0.0 PORT=4173 DATA_DIR=/app/data
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:4173/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/server.mjs"]

FROM node:20-alpine
RUN apk add --no-cache libc6-compat openssl postgresql-client
WORKDIR /app

COPY package.json package-lock.json ./
RUN NODE_ENV=development npm ci

COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN NODE_ENV=production npm run build

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "start"]

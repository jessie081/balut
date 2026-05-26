FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY . .

RUN mkdir -p /app/data
VOLUME ["/app/data"]

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/balut.db

EXPOSE 3000
CMD ["node", "server.js"]

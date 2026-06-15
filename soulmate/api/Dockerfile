FROM node:24-alpine

WORKDIR /app

COPY package.json ./
COPY src/ ./src/

RUN mkdir -p /app/data

VOLUME ["/app/data"]

EXPOSE 3001

CMD ["node", "src/server.js"]

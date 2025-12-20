# Minimal Dockerfile for Storage Microservice
# Stateless, portable, no dependencies

FROM node:20-alpine

WORKDIR /app

COPY index.js server.js README.md ./

EXPOSE 3003

CMD ["node", "server.js"]
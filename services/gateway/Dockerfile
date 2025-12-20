# Minimal Dockerfile for Gateway Microservice
# Stateless proxy router, no dependencies

FROM node:20-alpine

WORKDIR /app

COPY index.js server.js README.md ./

EXPOSE 3004

CMD ["node", "server.js"]
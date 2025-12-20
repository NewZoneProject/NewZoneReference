# Minimal Dockerfile for Metadata Microservice
# Stateless, portable, no dependencies

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy service files
COPY index.js server.js README.md ./

# Expose port
EXPOSE 3000

# Default command
CMD ["node", "server.js"]
# Optional container build for the backend - only needed if you deploy via
# Docker (a VPS, or a Render/Railway "Docker" service type instead of their
# native Node buildpack, which needs no Dockerfile at all).
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Persist uploaded files (course/lesson media, chat/journal attachments)
# outside the container layer - without a mounted volume here, anything
# written to /app/uploads is lost on every redeploy/restart.
VOLUME ["/app/uploads"]

EXPOSE 7001

CMD ["node", "server.js"]

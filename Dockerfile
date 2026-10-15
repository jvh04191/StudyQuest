# StudyQuest web app: builds the Expo web export and serves it with its API routes.
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx expo export -p web
ENV NODE_ENV=production
# Saved progress lives here. Mount a persistent disk at /data or it is lost when the host restarts.
ENV DATA_DIR=/data
EXPOSE 8080
# Set AI_PROVIDER, the matching API key and ACCESS_CODE as environment variables on your host.
CMD ["sh", "-c", "npx expo serve --port ${PORT:-8080}"]

# --- build stage ---
FROM node:20-alpine AS build

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_APP_URL

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Create .env file from build args
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env && \
    echo "VITE_APP_URL=${VITE_APP_URL}" >> .env

# Build the application (Vite will read .env during build)
RUN npm run build

# --- runtime stage (serve static via Node) ---
FROM node:20-alpine
WORKDIR /app
# lightweight static server
RUN npm i -g serve
# Vite default is /app/dist; CRA uses /app/build
COPY --from=build /app/dist /app/dist
EXPOSE 8080
CMD ["serve", "-s", "/app/dist", "-l", "8080"]

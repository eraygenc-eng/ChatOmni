# Build stage
FROM node:22-alpine AS build

WORKDIR /app

# Copy dependency files first for better Docker layer caching
COPY package.json package-lock.json ./

# Install exact dependency versions from package-lock.json
RUN npm ci

# Copy the frontend source code
COPY . .

# Build the production React application
RUN npm run build


# Production stage
FROM nginx:alpine

# Copy the compiled React application into Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx HTTP port
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
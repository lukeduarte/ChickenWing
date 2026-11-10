# Stage 1: generate the static site from site.json, content/ and writings/
FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN node build.js

# Stage 2: serve it with nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

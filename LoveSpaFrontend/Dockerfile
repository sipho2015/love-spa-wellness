FROM node:22-alpine AS build
WORKDIR /app

COPY LoveSpaFrontend/package*.json ./
RUN npm ci

COPY LoveSpaFrontend/ ./
RUN npm run build

FROM nginx:1.27-alpine AS final
COPY LoveSpaFrontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/LoveSpaFrontend/browser /usr/share/nginx/html

EXPOSE 80

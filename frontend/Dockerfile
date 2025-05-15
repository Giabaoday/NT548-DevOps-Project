FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json files và cài đặt dependencies
COPY package*.json ./
RUN npm install

# Copy mã nguồn
COPY . .

# Tạo file cấu hình môi trường
RUN echo "window.env = { API_URL: '${API_URL:-https://vvbcaer9bc.execute-api.ap-southeast-1.amazonaws.com/default}' };" > ./public/env-config.js

# Build ứng dụng
RUN npm run build

# Production image
FROM nginx:1.25.4-alpine3.19

RUN apk update && apk upgrade libxml2

# Copy output build vào thư mục Nginx
COPY --from=build /app/build /usr/share/nginx/html

# Copy cấu hình Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
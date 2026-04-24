FROM node:22-alpine

WORKDIR /app

COPY . .

# Build the library package first (used by poc local file dependency)
RUN npm ci && npm run build

WORKDIR /app/poc
RUN npm ci

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--legacy-watch"]

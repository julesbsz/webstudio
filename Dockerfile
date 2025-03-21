FROM node:20-bullseye AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY . .

RUN pnpm install

EXPOSE 5173

CMD ["pnpm", "dev", "--host"]



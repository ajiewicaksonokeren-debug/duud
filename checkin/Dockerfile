FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
ENV NODE_ENV=production DB_PATH=/app/data/checkin.sqlite PORT=4100
RUN mkdir -p /app/data
EXPOSE 4100
CMD ["node", "src/index.js"]

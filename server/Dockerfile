FROM node:22-bookworm-slim

WORKDIR /app

# better-sqlite3 ships prebuilt binaries for this platform, but keep a
# compiler toolchain around as a fallback in case none matches at build time.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# Persist the SQLite database outside the container image.
# Mount a volume at /app/data in your hosting provider and point DB_PATH there.
ENV DB_PATH=/app/data/tebak-gambar.sqlite
RUN mkdir -p /app/data

ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/index.js"]

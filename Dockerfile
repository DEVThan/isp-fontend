# Dockerfile — หน้าเว็บ ISP (Next.js 16, output: "standalone")
#
# build + run:  docker compose up -d --build
#
# ปลายทาง API มาจาก .env.production (commit ไว้ — https://api-isp.softtechnw.com/api/web)
# จะชี้ที่อื่นเฉพาะเครื่องนี้ ส่ง build arg API_BASE_URL / SO_SYNC_API_BASE_URL (ผ่าน .env ของ docker compose)
# ⚠️ rewrites ใน next.config.ts ถูกฝังตอน next build — เปลี่ยนปลายทางแล้วต้อง build ใหม่

# ---------- 1) dependencies ----------
# Next 16 ต้องการ Node >= 20.9
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 2) build ----------
FROM node:20-alpine AS builder
WORKDIR /app

# ไม่ส่งมา (ค่าว่าง) = ใช้ค่าใน .env.production
ARG API_BASE_URL=""
ARG SO_SYNC_API_BASE_URL=""
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .
# ส่ง arg มา = เขียนทับใน .env.production (ไม่ export เป็น env ตรง ๆ) — standalone ก๊อปไฟล์นี้ไปให้ server.js อ่านตอนรันด้วย
# ค่า build กับค่าตอนรันจึงตรงกันเสมอ · ค่าว่างที่ export ไว้จะไม่ fallback ไปที่ไฟล์ จึงไม่ใช้ ENV
RUN if [ -n "$API_BASE_URL" ]; then \
      sed -i "s|^API_BASE_URL=.*|API_BASE_URL=$API_BASE_URL|" .env.production; fi && \
    if [ -n "$SO_SYNC_API_BASE_URL" ]; then \
      sed -i "s|^SO_SYNC_API_BASE_URL=.*|SO_SYNC_API_BASE_URL=$SO_SYNC_API_BASE_URL|" .env.production; fi && \
    grep -E '^(API_BASE_URL|SO_SYNC_API_BASE_URL)=' .env.production && \
    env -u API_BASE_URL -u SO_SYNC_API_BASE_URL npm run build

# ---------- 3) runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# standalone ไม่ก๊อป public กับ .next/static ให้ — ต้องก๊อปเองถึงจะเสิร์ฟไฟล์ static ได้
# (.env.production ติดมากับ standalone แล้ว)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

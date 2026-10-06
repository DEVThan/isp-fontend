# isp-fontend

Admin template สำหรับระบบหลังบ้าน ISP — Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + shadcn/ui + next-intl (ไทย/อังกฤษ)

## เริ่มใช้งาน

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## Deploy ด้วย Docker

```bash
git pull
cp .env.docker.example .env      # ครั้งแรกเท่านั้น — แก้ปลายทาง API / พอร์ตตามเครื่อง
docker compose up -d --build     # build + รัน (container: isp-web, ฟังที่ 127.0.0.1:3000)
docker compose logs -f web
```

- ใช้ `output: "standalone"` — image มีแค่ `server.js` + ไฟล์ที่ใช้จริง (~55 MB ไม่รวม node)
- ปลายทาง API: **dev** อ่าน `.env.local` ของเครื่อง (localhost:8081) · **production** อ่าน `.env.production` ที่ commit ไว้ (`https://api-isp.softtechnw.com/api/web`)
- **ปลายทาง API ถูกฝังตอน build** (rewrites ใน `next.config.ts`) — แก้ค่าแล้วต้อง `--build` ใหม่ · ทับเฉพาะเครื่องได้ด้วย `.env` ของ docker compose
- container ฟังแค่ `127.0.0.1` — ให้ nginx บนเครื่อง proxy โดเมนมาที่ `http://127.0.0.1:3000`
- รูป/โลโก้/ไฟล์เทมเพลต Excel อยู่ที่ API (`/uploads/*` ถูกส่งต่อไป API) ไม่ได้อยู่ใน image นี้

## โครงสร้าง

```
messages/
├── th.json                     # ข้อความภาษาไทย (ค่าเริ่มต้น)
└── en.json                     # ข้อความภาษาอังกฤษ
src/
├── app/
│   ├── layout.tsx              # root layout — ฟอนต์, ThemeProvider, NextIntlClientProvider
│   ├── login/page.tsx          # หน้าเข้าสู่ระบบ (นอก (dashboard) จึงไม่มี sidebar)
│   └── (dashboard)/
│       ├── layout.tsx          # SidebarProvider + AppSidebar + SiteHeader
│       ├── page.tsx            # แดชบอร์ด (stat cards, กราฟทราฟฟิก, สัดส่วนแพ็กเกจ)
│       ├── customers/
│       │   ├── page.tsx        # รายชื่อลูกค้า + ฟิลเตอร์
│       │   ├── packages/       # แพ็กเกจ
│       │   └── areas/          # พื้นที่ให้บริการ
│       ├── invoices/
│       │   ├── page.tsx        # ใบแจ้งหนี้แยกแท็บตามสถานะ
│       │   └── payments/       # การชำระเงิน
│       ├── tickets/page.tsx    # งานแจ้งปัญหา
│       └── settings/
│           ├── page.tsx        # ตั้งค่าองค์กร/การเรียกเก็บเงิน
│           └── users/          # ผู้ใช้และสิทธิ์
├── components/
│   ├── app-sidebar.tsx         # เมนูข้าง — ยุบเป็นไอคอนได้, submenu แบบพับได้
│   ├── site-header.tsx         # breadcrumb + ค้นหา + สลับภาษา + สลับธีม
│   ├── language-switcher.tsx   # ตัวสลับภาษา (เขียน cookie แล้ว router.refresh())
│   ├── login-form.tsx          # ฟอร์มเข้าสู่ระบบ (useActionState + server action)
│   ├── nav-user.tsx  page-header.tsx  stat-card.tsx
│   ├── status-badge.tsx  traffic-chart.tsx  package-mix.tsx
│   └── ui/                     # shadcn/ui (Base UI primitives)
├── i18n/
│   ├── config.ts               # รายชื่อภาษา + ชื่อ cookie
│   ├── locale.ts               # อ่านภาษาปัจจุบันจาก cookie
│   ├── actions.ts              # server action เขียน cookie ตอนสลับภาษา
│   └── request.ts              # ต่อ next-intl เข้ากับแต่ละ request
├── hooks/use-mobile.ts
└── lib/
    ├── nav.ts                  # ผังเมนู (key + submenu) และตัวช่วยทำ breadcrumb
    ├── auth.ts                 # ชื่อ cookie เซสชัน + ตัวตรวจฟอร์ม (คืน key ไม่ใช่ข้อความ)
    ├── auth-actions.ts         # server action signIn / signOut — จุดต่อ API จริง
    ├── mock-data.ts            # ข้อมูลตัวอย่าง — เปลี่ยนเป็น fetch API จริงตรงนี้
    └── utils.ts                # cn()
```

## หลายภาษา (i18n)

ใช้ `next-intl` แบบ **ไม่มี prefix ใน URL** — `/customers` เป็น `/customers` เสมอไม่ว่าภาษาอะไร
ภาษาที่เลือกเก็บใน cookie `NEXT_LOCALE` แล้วอ่านฝั่ง server ใน `src/i18n/request.ts`

- ข้อความ UI อยู่ใน `messages/th.json` และ `messages/en.json` (โครงสร้าง key ต้องตรงกันทั้งสองไฟล์)
- Server Component ใช้ `getTranslations()` / Client Component ใช้ `useTranslations()`
- ตัวเลขและสกุลเงินจัดรูปแบบตาม locale ผ่าน `formatTHB(value, locale)` และ `Intl.NumberFormat`
- **เพิ่มภาษาใหม่**: เพิ่มรหัสภาษาใน `src/i18n/config.ts` แล้วสร้าง `messages/<code>.json` — เท่านั้น
  (ถ้าเป็นภาษาที่ต้องใช้ฟอนต์อื่น เช่น พม่า/จีน ให้เพิ่มฟอนต์ใน `src/app/layout.tsx` ด้วย)
- ชื่อลูกค้า/หัวข้องาน ฯลฯ เป็น **ข้อมูล** ไม่ใช่ข้อความ UI จึงไม่ถูกแปล

## หมายเหตุ

- shadcn/ui เวอร์ชันนี้สร้างบน **Base UI** จึงใช้ prop `render={<Link href="..." />}` แทน `asChild`
- เพิ่มคอมโพเนนต์: `npx shadcn@latest add <name>`
- ธีมสว่าง/มืดใช้ `next-themes` (`attribute="class"`) โทนสีอยู่ใน `src/app/globals.css`
- `turbopack.root` ถูกปักหมุดไว้ใน `next.config.ts` กัน Turbopack ไปหยิบ lockfile จากโฟลเดอร์แม่
- ทุกหน้าเป็น dynamic (`ƒ`) เพราะต้องอ่าน cookie ภาษาก่อน render
- โครงเมนูและ submenu แก้ที่ `src/lib/nav.ts` ที่เดียว — breadcrumb กับ sidebar อ่านจากผังเดียวกัน

## เข้าสู่ระบบ

หน้า `/login` ใช้งานได้จริงตั้งแต่ฟอร์มถึง redirect แล้ว แต่ **ยังไม่มีการตรวจรหัสผ่านจริง**

- ตรวจฟอร์มฝั่งเซิร์ฟเวอร์ใน `validateCredentials()` แล้วคืน *key* ของข้อความ ฝั่ง client ค่อยแปล
  จึงขึ้นข้อความผิดพลาดได้ทั้งสองภาษาโดยไม่ต้องมีข้อความอังกฤษ/ไทยฝังใน action
- ผ่านแล้ว `signIn()` จะออก cookie `isp_session` (httpOnly) แล้วพาไป `/`
  จุดที่ต้องแทนด้วย `fetch()` ไป backend จริงคอมเมนต์ไว้ชัดเจนใน `src/lib/auth-actions.ts`
- `signOut()` ต่อกับเมนู "ออกจากระบบ" ใน sidebar แล้ว
- **ยังไม่ได้ทำ route protection** — ตอนนี้เข้าหน้าอื่นได้โดยไม่ต้องล็อกอิน
  เมื่อมี backend จริงค่อยเพิ่ม `src/proxy.ts` เช็ค cookie แล้ว redirect ไป `/login`

## ต่อ API

`src/lib/mock-data.ts` เป็นจุดเดียวที่ถือข้อมูลตัวอย่าง แทนที่ค่าคงที่ด้วยฟังก์ชัน `async` ที่ `fetch()`
จาก backend แล้ว `await` ใน Server Component ของแต่ละหน้าได้ทันที

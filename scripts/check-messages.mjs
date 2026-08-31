/**
 * ตรวจไฟล์คำแปลใน messages/ ก่อน commit — รันผ่าน `npm run lint`
 *
 * ตรวจ 5 อย่าง เทียบกับภาษาหลัก (defaultLocale ใน src/i18n/config.ts):
 *   1. ทุกภาษาใน locales มีไฟล์ครบ
 *   2. คีย์ตรงกันทุกไฟล์ (ขาด/เกิน)
 *   3. ตัวแปรในข้อความตรงกัน — {count} หายไปแปลว่าเลขจะไม่ขึ้น
 *   4. ไม่มีค่าว่าง
 *   5. ไม่มีอักษรของภาษาอื่นปน (เช่น เขมร/ลาว หลุดมาในข้อความพม่า)
 *
 * type ของคีย์ถูกคุมด้วย src/global.d.ts อยู่แล้ว — ที่นี่คุมเรื่องที่ TypeScript มองไม่เห็น
 */
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const config = readFileSync(join(root, "src/i18n/config.ts"), "utf8")

const localesArray = config.match(/export const locales = \[([^\]]*)\]/)?.[1] ?? ""
const locales = [...localesArray.matchAll(/"([^"]+)"/g)].map((m) => m[1])
const defaultLocale = config.match(/defaultLocale: Locale = "([a-z-]+)"/)?.[1]

/** อักษรที่แต่ละภาษาใช้ได้ — ตัวอักษรละติน ตัวเลข และเครื่องหมายวรรคตอน ใช้ได้ทุกภาษาอยู่แล้ว */
const allowedScripts = { th: ["Thai"], en: [], mm: ["Myanmar"] }

const scriptRanges = [
  ["Thai", 0x0e00, 0x0e7f],
  ["Lao", 0x0e80, 0x0eff],
  ["Myanmar", 0x1000, 0x109f],
  ["Khmer", 0x1780, 0x17ff],
  ["Cyrillic", 0x0400, 0x04ff],
  ["Arabic", 0x0600, 0x06ff],
  ["Hebrew", 0x0590, 0x05ff],
  ["Devanagari", 0x0900, 0x097f],
  ["Han", 0x4e00, 0x9fff],
  ["Hiragana/Katakana", 0x3040, 0x30ff],
  ["Hangul", 0xac00, 0xd7af],
]

const scriptOf = (ch) => {
  const code = ch.codePointAt(0)
  return scriptRanges.find(([, lo, hi]) => code >= lo && code <= hi)?.[0]
}

/** { "login.errors.serverError": "..." } — เทียบง่ายกว่าเดินต้นไม้ */
function flatten(obj, prefix = "") {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object") Object.assign(out, flatten(v, `${prefix}${k}.`))
    else out[`${prefix}${k}`] = v
  }
  return out
}

const placeholders = (value) =>
  [...String(value).matchAll(/\{(\w+)/g)].map((m) => m[1]).sort().join(",")

const problems = []
const note = (locale, message) => problems.push(`${locale}: ${message}`)

const read = (locale) => {
  const file = join(root, "messages", `${locale}.json`)
  if (!existsSync(file)) return null
  return flatten(JSON.parse(readFileSync(file, "utf8")))
}

const base = read(defaultLocale)
if (!base) {
  console.error(`✗ ไม่พบไฟล์ภาษาหลัก messages/${defaultLocale}.json`)
  process.exit(1)
}

for (const locale of locales) {
  const messages = read(locale)
  if (!messages) {
    note(locale, `ไม่มีไฟล์ messages/${locale}.json ทั้งที่อยู่ใน locales`)
    continue
  }

  for (const key of Object.keys(base)) {
    if (!(key in messages)) note(locale, `ขาดคีย์ ${key}`)
  }
  for (const key of Object.keys(messages)) {
    if (!(key in base)) note(locale, `มีคีย์เกินมา ${key} (ไม่มีใน ${defaultLocale})`)
  }

  const scripts = allowedScripts[locale]
  if (!scripts) note(locale, `ยังไม่ได้กำหนดอักษรที่ใช้ได้ใน allowedScripts — เพิ่มใน scripts/check-messages.mjs`)

  for (const [key, value] of Object.entries(messages)) {
    if (typeof value !== "string" || value.trim() === "") {
      note(locale, `ค่าว่าง ${key}`)
      continue
    }

    if (key in base && placeholders(value) !== placeholders(base[key])) {
      note(locale, `ตัวแปรไม่ตรงกับ ${defaultLocale} ที่ ${key} — ควรมี {${placeholders(base[key]) || "ไม่มี"}} แต่พบ {${placeholders(value) || "ไม่มี"}}`)
    }

    if (scripts) {
      const foreign = [...value].filter((ch) => {
        const script = scriptOf(ch)
        return script && !scripts.includes(script)
      })
      if (foreign.length > 0) {
        const names = [...new Set(foreign.map(scriptOf))].join("/")
        note(locale, `มีอักษร ${names} ปนที่ ${key} → "${foreign.join("")}"`)
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`✗ messages/ มีปัญหา ${problems.length} จุด\n`)
  for (const p of problems) console.error(`  ${p}`)
  console.error("")
  process.exit(1)
}

console.log(`✓ messages/ ผ่าน — ${locales.join(", ")} คีย์ละ ${Object.keys(base).length} รายการ ตรงกันทั้งหมด`)

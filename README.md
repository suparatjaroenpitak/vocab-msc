# LexiFlow

แอป Next.js + Tailwind + PostgreSQL สำหรับเรียนรู้คำศัพท์อังกฤษด้วยการนำเข้า, ทบทวนแบบ spaced repetition และควิซ

คลังคำศัพท์ถูกบันทึกใน PostgreSQL และ cache ตามผู้ใช้ใน `localStorage` เพื่อไม่ให้รายการหายระหว่าง render หรือ refresh ระหว่างที่กำลัง sync กับฐานข้อมูล นอกจากนี้ยังมีเสียงอ่านผ่าน Web Speech API: ปุ่ม `EN` อ่านคำศัพท์อังกฤษ และปุ่ม `ไทย` อ่านคำแปลภาษาไทย

## เริ่มใช้งาน

```bash
npm install
copy .env.example .env
npm run dev
```

เปิด `http://localhost:3000` แล้ว login ด้วย Google ก่อนใช้งาน คำศัพท์และหมวดหมู่จะถูกผูกกับอีเมลของบัญชีที่ login อยู่ ไม่มีโหมดผู้ใช้ร่วมกัน

## Google OAuth

สร้าง OAuth Client ใน Google Cloud แล้วใส่ค่า `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` และ `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true` ใน `.env` จากนั้นเพิ่ม callback URL:

```text
http://localhost:3000/api/auth/callback/google
```

เมื่อผู้ใช้ล็อกอินด้วย Google คำศัพท์และหมวดหมู่จะถูกแยกตามอีเมลของผู้ใช้ใน PostgreSQL ทุก API ตรวจ session และตอบ `401` หากยังไม่ได้ login

## Deploy บน Vercel พร้อม PostgreSQL

สร้าง PostgreSQL จาก Vercel Marketplace (เช่น Neon, Supabase หรือ AWS) แล้วเพิ่ม `DATABASE_URL` ใน Vercel Project Settings → Environment Variables สำหรับ Production และ Preview ตามที่ต้องการ หาก integration ให้ตัวแปรชื่อ `POSTGRES_URL` แอปรองรับชื่อนี้ด้วย ห้าม commit ค่า connection string ลง Git จากนั้น redeploy Vercel ทุกครั้งหลังแก้ environment

หลังตั้งค่า connection string แล้ว ให้สร้างตารางครั้งแรกจากเครื่องที่มี environment เดียวกันด้วย `npm run db:push` หรือใช้ migration ใน `db/migrations` ผ่านเครื่องมือ PostgreSQL ของคุณ

## รูปแบบนำเข้า

รองรับรายการแบบมีเลขลำดับหรือไม่มีเลขลำดับ เช่น `airborne (adj.) - ทางอากาศ`, tab-separated และ JSON ที่มีคีย์ `term`, `definition`, `partOfSpeech`/`pos`

ฐานข้อมูลใช้ Drizzle schema ใน `db/schema.ts` และ migration ใน `db/migrations` ต้อง apply migration กับ PostgreSQL ของ Vercel ก่อนใช้งานจริง ไฟล์ SQLite เดิมไม่ได้ถูกย้ายข้อมูลอัตโนมัติ

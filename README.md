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

เมื่อผู้ใช้เปิดคลังคำศัพท์ ระบบจะเพิ่มชุดคำศัพท์ TOEIC 500 คำลงในหมวด `TOEIC 500` ของบัญชีนั้นโดยอัตโนมัติ ทำครั้งเดียวต่อบัญชีและไม่เขียนทับคำแปล หมวดหมู่ หรือสถิติของคำที่มีอยู่แล้ว

## Deploy บน Vercel พร้อม PostgreSQL

สร้าง PostgreSQL จาก Vercel Marketplace (เช่น Neon, Supabase หรือ AWS) แล้วเพิ่ม `DATABASE_URL` ใน Vercel Project Settings → Environment Variables สำหรับ Production และ Preview ตามที่ต้องการ หาก integration ให้ตัวแปรชื่อ `POSTGRES_URL` แอปรองรับชื่อนี้ด้วย ห้าม commit ค่า connection string ลง Git จากนั้น redeploy Vercel ทุกครั้งหลังแก้ environment

หลังตั้งค่า connection string แล้ว ให้สร้างตารางครั้งแรกจากเครื่องที่มี environment เดียวกันด้วย `npm run db:push` หรือใช้ migration ใน `db/migrations` ผ่านเครื่องมือ PostgreSQL ของคุณ สำหรับระบบ seed ชุดคำศัพท์ ต้องสร้างตาราง `user_seed_states` ก่อน deploy โดยรันคำสั่งเดียวนี้ใน Neon SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS "user_seed_states" (
  "id" serial PRIMARY KEY,
  "user_email" text NOT NULL,
  "seed_key" text NOT NULL,
  "applied_at" text NOT NULL,
  CONSTRAINT "user_seed_states_user_seed_idx" UNIQUE ("user_email", "seed_key")
);
```

รันเพียงคำสั่ง SQL นี้แยกหนึ่งครั้ง เมื่อ deploy โค้ดแล้ว ผู้ใช้แต่ละบัญชีจะได้รับคำศัพท์ครบ 500 คำในครั้งแรกที่เปิดคลัง

ผลควิซจะถูกบันทึกใน `quiz_attempts` พร้อมคะแนน จำนวนข้อ ชื่อบัญชี Google และเวลาเล่น หน้า “สถิติและอันดับ” แสดงคะแนนสูงสุด คะแนนเฉลี่ย จำนวนรอบ และอันดับจากคะแนนสูงสุดเป็นเปอร์เซ็นต์ ชื่อและคะแนนจะแสดงให้ผู้ใช้ที่เข้าสู่ระบบเห็น โดยไม่แสดงอีเมล

เมื่อเพิ่มตารางหรือแก้ schema ให้ apply schema ล่าสุดกับ PostgreSQL ก่อน deploy โค้ด เช่น `npm run db:push` โดยใช้ `DATABASE_URL` ของฐานข้อมูลเป้าหมาย

## รูปแบบนำเข้า

รองรับรายการแบบมีเลขลำดับหรือไม่มีเลขลำดับ เช่น `airborne (adj.) - ทางอากาศ`, tab-separated และ JSON ที่มีคีย์ `term`, `definition`, `partOfSpeech`/`pos`

ฐานข้อมูลใช้ Drizzle schema ใน `db/schema.ts` และ migration ใน `db/migrations` ต้อง apply migration กับ PostgreSQL ของ Vercel ก่อนใช้งานจริง ไฟล์ SQLite เดิมไม่ได้ถูกย้ายข้อมูลอัตโนมัติ

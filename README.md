# LexiFlow

แอป Next.js + Tailwind + Netlify Database (Postgres) สำหรับเรียนรู้คำศัพท์อังกฤษด้วยการนำเข้า, ทบทวนแบบ spaced repetition และควิซ

คลังคำศัพท์ถูกบันทึกใน Netlify Database (Postgres) และ cache ตามผู้ใช้ใน `localStorage` เพื่อไม่ให้รายการหายระหว่าง render หรือ refresh ระหว่างที่กำลัง sync กับฐานข้อมูล นอกจากนี้ยังมีเสียงอ่านผ่าน Web Speech API: ปุ่ม `EN` อ่านคำศัพท์อังกฤษ และปุ่ม `ไทย` อ่านคำแปลภาษาไทย

## เริ่มใช้งาน

```bash
npm install
copy .env.example .env.local
netlify dev --port 8889
```

เปิด `http://localhost:8889` ได้ทันที โหมดเริ่มต้นใช้ผู้ใช้เดโม่ `demo@local` 

## Google OAuth

สร้าง OAuth Client ใน Google Cloud แล้วใส่ค่า `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET` และ `NEXTAUTH_URL` ใน `.env.local` จากนั้นเพิ่ม callback URL:

```text
http://localhost:8889/api/auth/callback/google
```

เมื่อผู้ใช้ล็อกอินด้วย Google คำศัพท์จะถูกแยกตามอีเมลของผู้ใช้ใน Netlify Database (Postgres)

## รูปแบบนำเข้า

รองรับรายการแบบมีเลขลำดับหรือไม่มีเลขลำดับ เช่น `airborne (adj.) - ทางอากาศ`, tab-separated และ JSON ที่มีคีย์ `term`, `definition`, `partOfSpeech`/`pos`

ฐานข้อมูลใช้ Drizzle schema ใน `db/schema.ts` และ migration ใน `netlify/database/migrations` ซึ่ง Netlify นำไปใช้ตอน deploy โดยอัตโนมัติ ไฟล์ SQLite เดิมไม่ได้ถูกย้ายข้อมูลอัตโนมัติ

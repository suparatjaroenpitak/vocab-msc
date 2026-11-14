# LexiFlow

แอป Next.js + Tailwind + SQLite สำหรับเรียนรู้คำศัพท์อังกฤษด้วยการนำเข้า, ทบทวนแบบ spaced repetition และควิซ

## เริ่มใช้งาน

```bash
npm install
copy .env.example .env.local
npm run dev
```

เปิด `http://localhost:3000` ได้ทันที โหมดเริ่มต้นใช้ผู้ใช้เดโม่ `demo@local` และมีคำศัพท์ตัวอย่างให้ลองทบทวน

## Google OAuth

สร้าง OAuth Client ใน Google Cloud แล้วใส่ค่า `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET` และ `NEXTAUTH_URL` ใน `.env.local` จากนั้นเพิ่ม callback URL:

```text
http://localhost:3000/api/auth/callback/google
```

เมื่อผู้ใช้ล็อกอินด้วย Google คำศัพท์จะถูกแยกตามอีเมลของผู้ใช้ใน SQLite

## รูปแบบนำเข้า

รองรับรายการแบบมีเลขลำดับหรือไม่มีเลขลำดับ เช่น `airborne (adj.) - ทางอากาศ`, tab-separated และ JSON ที่มีคีย์ `term`, `definition`, `partOfSpeech`/`pos`

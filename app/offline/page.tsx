export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="w-full max-w-md rounded-[32px] border border-ink/10 bg-white p-8 text-center shadow-soft sm:p-10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-ink text-3xl text-coral">↗</div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-coral">offline mode</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">ขณะนี้ออฟไลน์</h1>
        <p className="mt-4 text-sm leading-7 text-ink/55">เชื่อมต่ออินเทอร์เน็ตเพื่อเข้าสู่ระบบ ซิงก์คลังคำศัพท์ และบันทึกผลการเรียน แล้วลองเปิดแอปอีกครั้ง</p>
        <a href="/" className="mt-8 inline-flex rounded-2xl bg-ink px-5 py-3.5 text-sm font-bold text-white transition hover:bg-coral">ลองเชื่อมต่ออีกครั้ง</a>
      </section>
    </main>
  );
}

export async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || "ระบบไม่สามารถบันทึกคำศัพท์ได้ กรุณาลองใหม่");
    if (!payload) throw new Error("เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง กรุณาลองใหม่");
    return payload as T;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("ใช้เวลานานเกินไป กรุณาตรวจสอบคลังคำศัพท์ก่อนลองนำเข้าอีกครั้ง");
    if (error instanceof TypeError) throw new Error("เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

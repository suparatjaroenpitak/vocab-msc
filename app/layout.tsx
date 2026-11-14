import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LexiFlow — ฝึกศัพท์อังกฤษให้จำได้จริง",
  description: "นำเข้าคำศัพท์ ทบทวนแบบ spaced repetition และฝึกควิซในที่เดียว"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

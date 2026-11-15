import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { PWARegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "MSC Vocab — ฝึกศัพท์อังกฤษให้จำได้จริง",
  description: "นำเข้าคำศัพท์ ทบทวนแบบ spaced repetition และฝึกควิซในที่เดียว",
  applicationName: "MSC Vocab",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "MSC Vocab", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icon-512.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#17233c",
  colorScheme: "light"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>
        <Providers>
          <PWARegister />
          {children}
        </Providers>
      </body>
    </html>
  );
}

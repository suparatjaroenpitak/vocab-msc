import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MSC Vocab — ฝึกศัพท์อังกฤษให้จำได้จริง",
    short_name: "MSC Vocab",
    description: "คลังคำศัพท์ส่วนตัว พร้อมทบทวนและฝึกควิซ",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f6f4ee",
    theme_color: "#17233c",
    lang: "th",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}

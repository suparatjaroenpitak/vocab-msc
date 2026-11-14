import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17233c",
        cream: "#f6f4ee",
        coral: "#f26755",
        mint: "#d9f4e6",
        lilac: "#e9e4ff",
        sand: "#f3ead8"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(23, 35, 60, 0.08)",
        card: "0 8px 25px rgba(23, 35, 60, 0.06)"
      },
      fontFamily: {
        sans: ["var(--font-geist)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;

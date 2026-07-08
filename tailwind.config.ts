import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Utilitarian palette: high contrast for warehouse/store-floor lighting
        ink: "#14181B",
        paper: "#F7F8F6",
        line: "#DADFE1",
        brand: "#1F6F50", // stock-green: found / in-stock
        warn: "#B3541E", // amber-clay: low stock
        danger: "#A3352B", // out of stock / errors
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["SFMono-Regular", "Menlo", "monospace"],
      },
      spacing: {
        tap: "48px", // minimum comfortable tap target
      },
    },
  },
  plugins: [],
} satisfies Config;

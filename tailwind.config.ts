import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#16a34a",
          hover: "#15803d",
          light: "#dcfce7",
          lightest: "#f0fdf4",
        },
        sidebar: {
          bg: "#fafbfc",
        },
        border: {
          DEFAULT: "#e5e7eb",
          light: "#f3f4f6",
        },
        text: {
          primary: "#111827",
          secondary: "#6b7280",
          muted: "#9ca3af",
        },
        badge: {
          scheduled: { bg: "#dcfce7", text: "#16a34a" },
          sent: { bg: "#dbeafe", text: "#2563eb" },
          failed: { bg: "#fee2e2", text: "#dc2626" },
          processing: { bg: "#fef3c7", text: "#d97706" },
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      }
    },
  },
  plugins: [],
};
export default config;

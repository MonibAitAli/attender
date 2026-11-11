import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0B1F1A",
          2: "#12332B",
          3: "#1A4439",
        },
        chalk: {
          DEFAULT: "#F4F0E6",
          dim: "#CFC9B8",
        },
        marigold: "#E9B44C",
        mint: "#7CC7A6",
        coral: "#E76F51",
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        sans: ["Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["Cascadia Code", "Consolas", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        pass: "0 24px 60px -24px rgba(0, 0, 0, 0.65)",
      },
    },
  },
  plugins: [],
};

export default config;

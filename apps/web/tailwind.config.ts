import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#08080a",
          900: "#0b0b0e",
          850: "#0f0f13",
          800: "#141419",
          750: "#191920",
          700: "#20202a",
          600: "#2a2a36",
        },
        line: "#262630",
        fog: "#9a9aa8",
        chalk: "#f4f4f7",
        brand: {
          DEFAULT: "#19e57f",
          soft: "#5cf0a8",
          deep: "#0fb463",
        },
        magenta: {
          DEFAULT: "#ff3d81",
          soft: "#ff6fa1",
        },
        violet: {
          DEFAULT: "#8b5cf6",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI",
          "Roboto", "Inter", "Helvetica Neue", "Arial", "sans-serif",
        ],
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(25,229,127,0.25), 0 12px 40px -12px rgba(25,229,127,0.35)",
        "glow-magenta": "0 0 0 1px rgba(255,61,129,0.25), 0 12px 40px -12px rgba(255,61,129,0.35)",
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 20px 50px -30px rgba(0,0,0,0.9)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;

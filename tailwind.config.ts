// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /* ---------- TYPOGRAPHY & COLORS ---------- */
      fontFamily: {
        sans: ["Montserrat", "Poppins", "sans-serif"],
        heading: ["Montserrat", "sans-serif"],
        recoleta: ["Recoleta", "serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        twitter: {
          blue: "#0099db",
          light: "#e8f5fd",
          dark: "#0077b5",
        },
        chirp: {
          orange: "#FF6B35",
          gray: "#8E9196",
        },
        darkBlue: {
          DEFAULT: "#0085C5",
          light: "#33A2D8",
          medium: "#006CA1",
          dark: "#00537D",
        },
        navy: {
          DEFAULT: "#1A1F2C",
        },
      },

      /* ---------- RADII ---------- */
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      /* ---------- KEYFRAMES ---------- */
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-slow": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(10px)" },
        },
        wave: {
          "0%": { transform: "rotate(0deg)" },
          "15%": { transform: "rotate(14deg)" },
          "30%": { transform: "rotate(-8deg)" },
          "40%": { transform: "rotate(14deg)" },
          "50%": { transform: "rotate(-4deg)" },
          "60%": { transform: "rotate(10deg)" },
          "70%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(0deg)" },
        },
        "pulse-subtle": {
          "0%": { opacity: "1" },
          "50%": { opacity: "0.8" },
          "100%": { opacity: "1" },
        },
        "glow-pulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(0, 135, 200, 0)" },
          "50%": { boxShadow: "0 0 10px 3px rgba(0, 135, 200, 0.4)" },
          "100%": { boxShadow: "0 0 0 0 rgba(0, 135, 200, 0)" },
        },
        /* Existing upward scroll */
        "scroll-slow": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" },
        },
        /* NEW downward scroll for alternating columns */
        "scroll-slow-reverse": {
          "0%": { transform: "translateY(-50%)" },
          "100%": { transform: "translateY(0)" },
        },
      },

      /* ---------- ANIMATIONS ---------- */
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "fade-in-slow": "fade-in-slow 0.8s ease-out",
        wave: "wave 3s ease-in-out infinite",
        "pulse-subtle": "pulse-subtle 4s ease-in-out infinite",
        "glow-pulse": "glow-pulse 8s ease-in-out infinite",
        "scroll-slow": "scroll-slow 120s linear infinite",
        /* NEW */
        "scroll-slow-reverse": "scroll-slow-reverse 120s linear infinite",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
} satisfies Config;

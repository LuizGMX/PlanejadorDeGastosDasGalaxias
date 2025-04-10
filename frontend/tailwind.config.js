/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "var(--border-color)",
        input: "var(--input-background)",
        ring: "var(--primary-color)",
        background: "var(--background-color)",
        foreground: "var(--text-color)",
        primary: {
          DEFAULT: "var(--primary-color)",
          foreground: "var(--secondary-color)",
        },
        secondary: {
          DEFAULT: "var(--secondary-color)",
          foreground: "var(--text-color)",
        },
        destructive: {
          DEFAULT: "var(--error-color)",
          foreground: "var(--text-color)",
        },
        muted: {
          DEFAULT: "var(--text-secondary)",
          foreground: "var(--text-color)",
        },
        accent: {
          DEFAULT: "var(--primary-color)",
          foreground: "var(--secondary-color)",
        },
        popover: {
          DEFAULT: "var(--card-background)",
          foreground: "var(--text-color)",
        },
        card: {
          DEFAULT: "var(--card-background)",
          foreground: "var(--text-color)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}


/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        vatech: {
          red: "#CC1234",
          "red-dark": "#a50e2b",
          "red-light": "#e8143b",
          "red-pale": "#fce8ec",
          dark: "#1a1a1a",
          gray: "#4a4a4a",
          "gray-mid": "#8a8a8a",
          "gray-light": "#f5f5f5",
          border: "#e0e0e0",
        },
      },
      fontFamily: {
        sans: ['"Exo 2"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.08)",
        "card-hover": "0 8px 40px rgba(204,18,52,0.15)",
        focus: "0 0 0 3px rgba(204,18,52,0.18)",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(22px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        bounceIn: {
          "0%": { opacity: "0", transform: "scale(0.25)" },
          "50%": { transform: "scale(1.18)" },
          "75%": { transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
        "fade-in": "fadeIn 0.4s ease-out both",
        "scale-in": "scaleIn 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
        "bounce-in": "bounceIn 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55) both",
        "slide-down": "slideDown 0.35s ease-out both",
        "success-card": "successCardIn 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      },
    },
  },
  plugins: [],
};

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // PerformUp Color Palette
      colors: {
        // Brand Colors
        performup: {
          blue: {
            DEFAULT: "#495C93",
            light: "#5d71a8",
            dark: "#3a4975",
          },
          gold: {
            DEFAULT: "#C8B38D",
            light: "#d4c4a3",
            dark: "#b09d77",
          },
        },
        // Semantic Colors
        success: {
          DEFAULT: "#10b981",
          light: "#34d399",
          dark: "#059669",
        },
        warning: {
          DEFAULT: "#f59e0b",
          light: "#fbbf24",
          dark: "#d97706",
        },
        error: {
          DEFAULT: "#ef4444",
          light: "#f87171",
          dark: "#dc2626",
        },
        // Calendar Event Colors
        calendar: {
          quant: "#3B82F6",
          verbal: "#8B5CF6",
          mentor: "#10B981",
          test: "#F59E0B",
          oral: "#EC4899",
          meeting: "#6B7280",
        },
        // Neutral shades
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
        },
        // shadcn/ui compatibility
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      // Typography - PerformUp Fonts
      fontFamily: {
        display: ['"DM Serif Display"', "serif"],
        body: ['"Plus Jakarta Sans"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
      // Font Sizes
      fontSize: {
        "display-2xl": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-xl": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg": ["3rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "display-md": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "display-sm": ["1.875rem", { lineHeight: "1.3" }],
      },
      // Spacing
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
      // Border Radius
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1rem",
        "2xl": "1.5rem",
      },
      // Box Shadow
      boxShadow: {
        "performup-sm": "0 1px 2px 0 rgba(73, 92, 147, 0.05)",
        "performup": "0 1px 3px 0 rgba(73, 92, 147, 0.1), 0 1px 2px -1px rgba(73, 92, 147, 0.1)",
        "performup-md": "0 4px 6px -1px rgba(73, 92, 147, 0.1), 0 2px 4px -2px rgba(73, 92, 147, 0.1)",
        "performup-lg": "0 10px 15px -3px rgba(73, 92, 147, 0.1), 0 4px 6px -4px rgba(73, 92, 147, 0.1)",
        "performup-xl": "0 20px 25px -5px rgba(73, 92, 147, 0.1), 0 8px 10px -6px rgba(73, 92, 147, 0.1)",
      },
      // Animations
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "fade-out": "fadeOut 200ms ease-in",
        "slide-in-bottom": "slideInBottom 300ms ease-out",
        "slide-in-right": "slideInRight 300ms ease-out",
        "shake": "shake 300ms ease-in-out",
        "bounce-in": "bounceIn 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "progress-shine": "progressShine 2s ease-in-out infinite",
        "pulse-gentle": "pulseGentle 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeOut: {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        slideInBottom: {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        slideInRight: {
          from: { transform: "translateX(20px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-10px)" },
          "75%": { transform: "translateX(10px)" },
        },
        bounceIn: {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        progressShine: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseGentle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      // Transitions
      transitionTimingFunction: {
        "bounce": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

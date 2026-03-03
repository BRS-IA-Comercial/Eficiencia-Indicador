
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Roboto', 'Inter', 'sans-serif'],
        headline: ['Roboto', 'Inter', 'sans-serif'],
        code: ['monospace'],
      },
      fontSize: {
        'xxs': '0.65rem',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#FF6600',
          dark: '#E65C00',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#00B050',
          dark: '#008F41',
          foreground: '#FFFFFF',
        },
        neutral: {
          DEFAULT: '#808080',
          dark: '#666666',
          foreground: '#FFFFFF',
        },
        "background-light": "#F5F5F5",
        "background-dark": "#1A1A1A",
        "surface-light": "#FFFFFF",
        "surface-dark": "#2D2D2D",
        "border-light": "#E0E0E0",
        "border-dark": "#404040",
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

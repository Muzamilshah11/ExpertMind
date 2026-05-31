/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',

    // Or if using `src` directory:
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        amethyst: {
          dark: 'var(--color-amethyst-dark)',
          medium: 'var(--color-amethyst-medium)',
        },
        'cyber-teal': 'var(--color-cyber-teal)',
        'glowing-magenta': 'var(--color-glowing-magenta)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
      },
    },
  },
  plugins: [],
};
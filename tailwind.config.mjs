/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Party colors — approximate, tuned to work in both themes
        dmk: '#d92828',       // red-black tradition
        aiadmk: '#00a651',    // green + red; using green
        bjp: '#f97316',       // saffron
        congress: '#009cde',  // sky blue
        vck: '#1e40af',       // deep blue
        pmk: '#facc15',       // yellow
        cpi: '#dc2626',       // red
        cpim: '#b91c1c',      // dark red
        naam: '#111827',      // black
        ind: '#6b7280',       // gray
      },
    },
  },
  plugins: [],
};

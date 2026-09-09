/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Party colors — approximate, tuned to work in both themes
        tvk: '#e11d48',       // TVK — bright red
        dmk: '#000000',       // black (DMK flag)
        inc: '#009cde',       // sky blue (Congress)
        aiadmk: '#00a651',    // green (AIADMK two-leaves)
        bjp: '#f97316',       // saffron
        vck: '#1e40af',       // deep blue
        pmk: '#facc15',       // yellow
        cpi: '#dc2626',       // red
        cpim: '#b91c1c',      // dark red
        ntk: '#111827',       // near-black
        ind: '#6b7280',       // gray
      },
    },
  },
  plugins: [],
};

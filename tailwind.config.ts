import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class', // <--- DODAJ TĘ LINIJKĘ
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // ... reszta kodu
};
export default config;
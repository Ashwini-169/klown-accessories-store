/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
        rotateCarousel: {
          '0%': { transform: 'translateX(0)' },
          '5%': { transform: 'translateX(0)' },
          '45%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(-100%)' },
          '95%': { transform: 'translateX(-200%)' },
          '100%': { transform: 'translateX(-200%)' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        scaleIn: 'scaleIn 0.2s ease-out',
        fadeOut: 'fadeOut 0.2s ease-in',
        scaleOut: 'scaleOut 0.2s ease-in',
        slideUp: 'slideUp 0.3s ease-out forwards',
        slideDown: 'slideDown 0.3s ease-in forwards',
        rotateCarousel: 'rotateCarousel 15s linear infinite',
      },
    },
  },
  plugins: [],
};

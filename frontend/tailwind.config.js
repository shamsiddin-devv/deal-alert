const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

function palette(name, stops = shades) {
  return Object.fromEntries(stops.map((stop) => [
    stop,
    `oklch(var(--${name}-${stop}) / <alpha-value>)`,
  ]));
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: palette('background'),
        foreground: palette('foreground'),
        primary: palette('primary'),
        accent: palette('accent'),
        secondary: palette('secondary'),
        danger: palette('danger', [100, 500, 600]),
      },
      fontFamily: {
        sans: 'var(--font-body)',
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
        label: 'var(--font-label)',
      },
      boxShadow: {
        card: '0 1px 2px oklch(var(--foreground-950) / 0.04)',
        lift: '0 8px 28px -12px oklch(var(--foreground-950) / 0.18)',
        pop: '0 18px 48px -18px oklch(var(--foreground-950) / 0.28)',
      },
    },
  },
};

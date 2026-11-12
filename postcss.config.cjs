// YouTube sets `html { font-size: 10px }`, which would shrink every rem-based
// Tailwind size inside our shadow-DOM UI. Converting rem to px (at the 16px
// browser default) keeps sizing identical on every page we render into.
const remToPx = () => ({
  postcssPlugin: 'rem-to-px',
  Declaration(decl) {
    if (decl.value.includes('rem')) {
      decl.value = decl.value.replace(
        /(-?\d*\.?\d+)rem\b/g,
        (_, n) => `${parseFloat((parseFloat(n) * 16).toFixed(4))}px`,
      );
    }
  },
});
remToPx.postcss = true;

module.exports = {
  plugins: [require('tailwindcss'), remToPx, require('autoprefixer')],
};

export default {
  '*.{ts,tsx,js,mjs,cjs}': ['oxlint --fix', 'oxfmt --no-error-on-unmatched-pattern'],
  '*.{json,jsonc,md,yml,yaml,css}': 'oxfmt --no-error-on-unmatched-pattern',
};

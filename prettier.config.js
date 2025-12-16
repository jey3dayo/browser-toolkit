/** @type {import('prettier').Config} */

module.exports = {
  printWidth: 120,
  singleQuote: true,
  trailingComma: 'all',
  arrowParens: 'avoid',
  proseWrap: 'preserve',
  plugins: ['@ianvs/prettier-plugin-sort-imports'],
  overrides: [
    {
      files: ['*.md'],
      options: {
        parser: 'markdown',
        embeddedLanguageFormatting: 'off',
        singleQuote: false,
      },
    },
  ],
  importOrder: [
    '^server-only$',
    '^(react/(.*)$)|^(react$)',
    '^(next/(.*)$)|^(next$)',
    '^(@prisma/(.*)$)|^(prisma$)',
    '^(radix-ui/(.*)$)',
    '<THIRD_PARTY_MODULES>',
    '^types$',
    '^@/env(.*)$',
    '^@/types/(.*)$',
    '^@/app/(.*)$',
    '^@/components/(.*)$',
    '^@/components/ui/(.*)$',
    '^@/(config/(.*)$)|^@/(config$)',
    '^@/(constants/(.*)$)|^@/(constants$)',
    '^@/hooks/(.*)$',
    '^@/lib/(.*)$',
    '^@/styles/(.*)$',
    '^[./]',
  ],
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
};

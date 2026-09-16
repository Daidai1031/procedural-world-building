export function createCodeTheme(token) {
  return {
    name: 'seedling-light',
    type: 'light',
    colors: {
      'editor.background': token('--paper-2'),
      'editor.foreground': token('--ink'),
    },
    tokenColors: [
      { scope: ['variable', 'entity', 'support', 'punctuation'], settings: { foreground: token('--ink') } },
      { scope: ['keyword', 'storage'], settings: { foreground: token('--water-deep') } },
      { scope: ['string', 'string punctuation'], settings: { foreground: token('--moss-deep') } },
      { scope: ['constant.numeric'], settings: { foreground: token('--clay-deep') } },
      { scope: ['comment'], settings: { foreground: token('--ink-faint'), fontStyle: 'italic' } },
    ],
  }
}

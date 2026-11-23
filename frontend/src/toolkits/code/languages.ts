import { cssLanguage } from '@codemirror/lang-css';
import { htmlLanguage } from '@codemirror/lang-html';
import { javascriptLanguage, jsxLanguage, tsxLanguage, typescriptLanguage } from '@codemirror/lang-javascript';
import { LanguageSupport, type LRLanguage } from '@codemirror/language';

export type Lang = 'js' | 'ts' | 'jsx' | 'tsx' | 'html' | 'css';

export const languages: Record<Lang, LRLanguage> = {
  js: javascriptLanguage, ts: typescriptLanguage, jsx: jsxLanguage, tsx: tsxLanguage, html: htmlLanguage, css: cssLanguage,
};

export const langOf = (file: string): Lang => {
  const ext = file.slice(file.lastIndexOf('.') + 1);
  return ext in languages ? (ext as Lang) : 'js';
};

export const languageSupport = (file: string) => new LanguageSupport(languages[langOf(file)]);

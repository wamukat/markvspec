import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://wamukat.github.io',
  base: '/markvspec',
  integrations: [
    starlight({
      title: 'MarkVSpec',
      description: 'Write UI specifications in Markdown.',
      logo: {
        src: './src/assets/markvspec-icon.svg',
      },
      favicon: '/favicon.svg',
      defaultLocale: 'ja',
      locales: {
        ja: {
          label: '日本語',
          lang: 'ja',
        },
        en: {
          label: 'English',
          lang: 'en',
        },
      },
      pagefind: true,
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/wamukat/markvspec',
        },
      ],
      sidebar: [
        {
          label: 'はじめる',
          translations: {
            en: 'Start',
          },
          items: [
            { slug: 'start' },
            { slug: 'start/first-screen' },
            { slug: 'start/preview' },
            { slug: 'start/export' },
          ],
        },
        {
          label: 'ガイド',
          translations: {
            en: 'Guide',
          },
          items: [
            { slug: 'guide' },
            { slug: 'guide/markdown-model' },
            { slug: 'guide/document-structure' },
            { slug: 'guide/states' },
            { slug: 'guide/layout' },
            { slug: 'guide/elements' },
            { slug: 'guide/actions' },
            { slug: 'guide/validation' },
            { slug: 'guide/scenarios' },
            { slug: 'guide/partial-updates' },
            { slug: 'guide/history' },
          ],
        },
        {
          label: 'リファレンス',
          translations: {
            en: 'Reference',
          },
          items: [
            { slug: 'reference' },
            { slug: 'reference/file-format' },
            { slug: 'reference/grammar' },
            { slug: 'reference/sections' },
            { slug: 'reference/ids' },
            { slug: 'reference/elements' },
            { slug: 'reference/actions' },
            { slug: 'reference/validations' },
            { slug: 'reference/rules' },
            { slug: 'reference/history' },
            { slug: 'reference/cli' },
            { slug: 'reference/limitations' },
          ],
        },
        {
          label: 'レシピ',
          translations: {
            en: 'Recipes',
          },
          items: [
            { slug: 'recipes' },
            { slug: 'recipes/login-form' },
            { slug: 'recipes/loading-error' },
            { slug: 'recipes/server-partial-update' },
            { slug: 'recipes/pdf-export' },
          ],
        },
        {
          label: 'サンプル',
          translations: {
            en: 'Examples',
          },
          items: [{ slug: 'examples' }],
        },
        {
          label: 'コンセプト',
          translations: {
            en: 'Concepts',
          },
          items: [{ slug: 'concepts' }],
        },
      ],
    }),
  ],
});

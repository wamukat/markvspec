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
          label: 'Start',
          translations: {
            en: 'Start',
          },
          items: [{ slug: 'start' }],
        },
      ],
    }),
  ],
});

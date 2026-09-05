import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'MFTIK',
  description: 'Self-hosted trading desk — operator docs',
  cleanUrls: true,
  appearance: 'dark',
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/mft-logo.png' }],
  ],
  themeConfig: {
    logo: '/mft-logo.png',
    siteTitle: 'MFTIK',
    nav: [
      { text: 'Docs', link: '/' },
      { text: 'GitHub', link: 'https://github.com/lynxlinkage/mftik' },
      { text: 'mftik.com', link: 'https://mftik.com' },
    ],
    sidebar: [
      {
        text: 'Docs',
        items: [
          { text: 'What it is', link: '/' },
          { text: 'Quick start', link: '/quick-start' },
          { text: 'CLI', link: '/cli' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Self-host a node', link: '/self-host' },
          { text: 'Write & publish', link: '/publish' },
          { text: 'Hooks', link: '/hooks' },
          { text: 'Exchanges', link: '/exchanges' },
          { text: 'Sessions', link: '/sessions' },
        ],
      },
    ],
    search: {
      provider: 'local',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/lynxlinkage/mftik' },
    ],
    footer: {
      message: 'MIT Licensed · Product source <a href="https://github.com/lynxlinkage/mftik">lynxlinkage/mftik</a>',
      copyright: 'Copyright © lynxlinkage',
    },
  },
})

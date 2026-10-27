import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const source = JSON.parse(readFileSync(join(root, 'mftik-source.json'), 'utf8'))
const repoUrl = `https://github.com/${source.repo}`

export default defineConfig({
  title: 'mftik',
  description: 'Python STS SDK for mftiko',
  lang: 'en-US',
  cleanUrls: true,
  appearance: 'dark',
  srcExclude: ['README.md'],
  head: [['link', { rel: 'icon', type: 'image/png', href: '/mft-logo.png' }]],
  themeConfig: {
    logo: '/mft-logo.png',
    siteTitle: 'mftik',
    nav: [
      { text: 'Docs', link: '/' },
      { text: 'mftiko', link: source.mftiko },
      { text: 'GitHub', link: repoUrl },
    ],
    sidebar: source.sidebar,
    search: {
      provider: 'local',
    },
    socialLinks: [{ icon: 'github', link: repoUrl }],
    // First strategy and Examples both open examples.md. VitePress prev/next
    // keeps only the first of those links, which would skip Examples.
    docFooter: { prev: false, next: false },
    footer: {
      message: `mftik <a href="${repoUrl}/tree/${source.tag}">${source.tag}</a>`,
      copyright: 'Copyright © lynxlinkage',
    },
  },
})

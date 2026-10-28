import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { slugifyHeading } from './slugify-heading.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = JSON.parse(readFileSync(join(root, 'mftik-source.json'), 'utf8'))

const removed = [
  'quick-start.md',
  'cli.md',
  'architecture.md',
  'self-host.md',
  'publish.md',
  'hooks.md',
  'exchanges.md',
  'sessions.md',
]

test('pins the mftik commit and labels the site v1.1.0', () => {
  assert.equal(source.repo, 'lynxlinkage/mftik')
  assert.equal(source.version, 'v1.1.0')
  assert.equal(source.commit, '876e1ae0354acf497c4b5a203d9f48c8da970069')
  assert.equal(source.tag, undefined)
  assert.equal(source.mftiko, 'https://github.com/BullionBear/mftiko')
})

test('sidebar is Getting Started, Guides, and API Reference', () => {
  assert.deepEqual(
    source.sidebar.map((group) => group.text),
    ['Getting Started', 'Guides', 'API Reference'],
  )
  assert.deepEqual(
    source.sidebar[0].items.map((item) => item.text),
    ['Install and run', 'First strategy'],
  )
  assert.equal(source.sidebar[0].items[1].link, `/examples#${slugifyHeading('md_watch')}`)
  const guides = source.sidebar[1].items.map((item) => item.link)
  assert.equal(guides[guides.indexOf('/pack') + 1], '/session')
  assert.deepEqual(guides.slice(-2), ['/runtime', '/examples'])
  assert.deepEqual(source.sidebar[2].items, [{ text: 'API reference', link: '/reference' }])

  const linked = source.sidebar.flatMap((group) => group.items.map((item) => item.link.split('#')[0].slice(1)))
  assert.deepEqual([...new Set(linked)].sort(), [...source.pages].sort())
})

test('homepage states the SDK role and repeats the sidebar', () => {
  const index = readFileSync(join(root, 'docs/index.md'), 'utf8')
  assert.match(index, /mftik is the Python STS SDK for \[mftiko\]\(https:\/\/github\.com\/BullionBear\/mftiko\)\./)
  assert.ok(index.includes(`${source.version} guide`))
  for (const group of source.sidebar) {
    assert.match(index, new RegExp(`^## ${group.text}$`, 'm'))
    for (const item of group.items) {
      assert.ok(index.includes(`](${item.link})`), item.link)
    }
  }
  assert.doesNotMatch(index, /no separate documentation site/)
  assert.doesNotMatch(index, /trading desk/)
})

test('old pages are gone and fetched pages are not committed as source', () => {
  for (const name of removed) {
    assert.equal(existsSync(join(root, 'docs', name)), false, name)
  }
  assert.equal(existsSync(join(root, 'docs/index.md')), true)
  assert.equal(existsSync(join(root, 'docs/public/CNAME')), true)
  assert.equal(readFileSync(join(root, 'docs/public/CNAME'), 'utf8').trim(), 'docs.mftik.com')
  for (const page of source.pages) {
    execFileSync('git', ['check-ignore', '-q', `docs/${page}.md`], { cwd: root })
  }
  assert.throws(() => execFileSync('git', ['check-ignore', '-q', 'docs/index.md'], { cwd: root, stdio: 'ignore' }))
})

test('GitHub Pages deploy still publishes the VitePress dist', () => {
  const workflow = readFileSync(join(root, '.github/workflows/deploy-pages.yml'), 'utf8')
  assert.match(workflow, /branches: \[main\]/)
  assert.match(workflow, /npm run build/)
  assert.match(workflow, /path: docs\/\.vitepress\/dist/)
  assert.match(workflow, /actions\/deploy-pages@v4/)
})

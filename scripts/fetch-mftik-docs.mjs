import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { rewriteMarkdown } from './rewrite-mftik-markdown.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourceIndex = 'README.md'

export function loadSource() {
  const source = JSON.parse(readFileSync(join(root, 'mftik-source.json'), 'utf8'))
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source.repo)) {
    throw new Error('mftik-source.json repo must be owner/name')
  }
  if (!/^v\d+\.\d+\.\d+$/.test(source.version)) {
    throw new Error('mftik-source.json version must look like v1.2.3')
  }
  if (source.tag != null) {
    throw new Error('mftik-source.json must pin a commit, not a tag')
  }
  if (!/^[0-9a-f]{40}$/.test(source.commit)) {
    throw new Error('mftik-source.json commit must be a 40-character sha')
  }
  if (!Array.isArray(source.pages) || source.pages.some((page) => !/^[a-z0-9-]+$/.test(page))) {
    throw new Error('mftik-source.json pages must be slugs')
  }
  return source
}

export function fetchMftikDocs(source = loadSource()) {
  const dir = mkdtempSync(join(tmpdir(), 'mftik-docs-'))
  try {
    git(['init', '--quiet'], dir)
    git(['remote', 'add', 'origin', `https://github.com/${source.repo}.git`], dir)
    git(['sparse-checkout', 'init', '--cone'], dir)
    git(['sparse-checkout', 'set', 'docs/python'], dir)
    git(['fetch', '--depth', '1', '--filter=blob:none', 'origin', source.commit], dir)
    git(['-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD'], dir)
    const head = git(['rev-parse', 'HEAD'], dir).trim()
    if (head !== source.commit) {
      throw new Error(`fetched ${head}, config pins ${source.commit}`)
    }

    const docsPython = join(dir, 'docs', 'python')
    const entries = readdirSync(docsPython, { withFileTypes: true })
    const names = []
    for (const entry of entries) {
      if (!entry.isFile()) throw new Error(`unexpected docs/python entry: ${entry.name}`)
      names.push(entry.name)
    }
    names.sort()
    // README.md is the in-repo index. It says there is no documentation site.
    // This shell does not publish that file.
    const expected = [sourceIndex, ...source.pages.map((page) => `${page}.md`)].sort()
    if (names.join('\n') !== expected.join('\n')) {
      throw new Error(
        `docs/python file list does not match the shell.\n got: ${names.join(', ')}\n expected: ${expected.join(', ')}`,
      )
    }

    const docsDir = join(root, 'docs')
    for (const page of source.pages) {
      const filename = `${page}.md`
      const body = readFileSync(join(docsPython, filename), 'utf8')
      let rewritten
      try {
        rewritten = rewriteMarkdown(body, {
          repo: source.repo,
          ref: source.commit,
          pages: source.pages,
        })
      } catch (err) {
        throw new Error(`${filename}: ${err.message}`)
      }
      writeFileSync(join(docsDir, filename), rewritten)
    }

    const examples = readFileSync(join(docsDir, 'examples.md'), 'utf8')
    if (!/^## md_watch$/m.test(examples)) {
      throw new Error('examples.md has no "## md_watch" heading for the First strategy link')
    }
    console.log(`fetched ${source.repo} docs/python at ${source.commit} (${source.version} docs)`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function git(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    })
  } catch (err) {
    const detail = `${err.stderr || err.message || ''}`.trim().slice(0, 500)
    throw new Error(`git failed: ${detail}`)
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) {
  try {
    fetchMftikDocs()
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

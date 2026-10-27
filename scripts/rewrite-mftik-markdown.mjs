const citationFence =
  /^(?<indent> {0,3})```(?<lang>[A-Za-z0-9_+-]+)[ \t]+(?<path>[^\s:]+):(?<start>\d+)-(?<end>\d+)[ \t]*$/
const fenceOpen = /^(?<indent> {0,3})```(?<info>.*)$/
const fenceClose = /^ {0,3}```[ \t]*$/
const inlineLink = /(!?)\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g

export function blobUrl(repo, ref, repoPath, start, end) {
  const parts = repo.split('/')
  if (parts.length !== 2 || parts.some((part) => part.length === 0)) {
    throw new Error('repo must be owner/name')
  }
  assertRepoPath(repoPath)
  const [owner, name] = parts
  const encodedPath = repoPath.split('/').map(encodeURIComponent).join('/')
  let url = `https://github.com/${owner}/${name}/blob/${encodeURIComponent(ref)}/${encodedPath}`
  if (start != null) {
    url += end != null && Number(end) !== Number(start) ? `#L${start}-L${end}` : `#L${start}`
  }
  return url
}

export function rewriteMarkdown(markdown, { repo, ref, pages }) {
  if (!Array.isArray(pages)) throw new Error('pages must be a list')
  const normalized = markdown.replace(/\r\n/g, '\n')
  const endsWithNewline = normalized.endsWith('\n')
  const lines = normalized.split('\n')
  if (endsWithNewline) lines.pop()

  const output = []
  let inFence = false
  for (const line of lines) {
    if (inFence) {
      output.push(line)
      if (fenceClose.test(line)) inFence = false
      continue
    }

    const citation = line.match(citationFence)
    if (citation) {
      const { indent, lang, path, start, end } = citation.groups
      const startLine = Number(start)
      const endLine = Number(end)
      if (startLine < 1 || endLine < startLine || endLine > 100000) {
        throw new Error(`unsupported line range: ${path}:${start}-${end}`)
      }
      assertRepoPath(path)
      if (output.length > 0 && output[output.length - 1] !== '') output.push('')
      const label = `${path}:${start}-${end}`
      output.push(`${indent}[${label}](${blobUrl(repo, ref, path, startLine, endLine)})`)
      output.push('')
      output.push(`${indent}\`\`\`${lang}`)
      inFence = true
      continue
    }

    if (fenceOpen.test(line)) {
      output.push(line)
      inFence = true
      continue
    }

    output.push(rewriteInlineLinks(line, { repo, ref, pages }))
  }
  if (inFence) throw new Error('unclosed code fence')

  const result = `${output.join('\n')}${endsWithNewline || output.length > 0 ? '\n' : ''}`
  const before = fenceBodies(normalized.endsWith('\n') ? normalized : `${normalized}\n`)
  const after = fenceBodies(result.endsWith('\n') ? result : `${result}\n`)
  if (before.length !== after.length || before.some((body, i) => body !== after[i])) {
    throw new Error('rewrite changed a fenced code block')
  }
  return result
}

function rewriteInlineLinks(line, options) {
  return line.replace(inlineLink, (full, bang, text, dest, title = '') => {
    const rewritten = rewriteDestination(dest, options)
    if (!rewritten) return full
    return `${bang}[${text}](${rewritten}${title})`
  })
}

function rewriteDestination(dest, { repo, ref, pages }) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(dest) || dest.startsWith('#') || dest.startsWith('/')) {
    return null
  }
  const hashAt = dest.indexOf('#')
  const beforeHash = hashAt === -1 ? dest : dest.slice(0, hashAt)
  const hash = hashAt === -1 ? '' : dest.slice(hashAt)
  const path = beforeHash.replace(/^\.\//, '')
  if (path === '' || isPublishedPage(path, pages)) return null
  const repoPath = repoPathFromLink(path)
  if (!repoPath) throw new Error(`unsupported relative link: ${dest}`)
  return blobUrl(repo, ref, repoPath) + hash
}

function isPublishedPage(path, pages) {
  if (path.includes('..') || path.includes('/')) return false
  if (!path.endsWith('.md')) return false
  return pages.includes(path.slice(0, -'.md'.length))
}

function repoPathFromLink(path) {
  const marker = 'examples/python/'
  const at = path.indexOf(marker)
  if (at === -1) return null
  const repoPath = path.slice(at)
  try {
    assertRepoPath(repoPath)
  } catch {
    return null
  }
  return repoPath
}

function assertRepoPath(repoPath) {
  if (!/^[A-Za-z0-9_./-]+$/.test(repoPath)) {
    throw new Error(`unsupported path: ${repoPath}`)
  }
  if (repoPath.split('/').some((part) => part === '' || part === '.' || part === '..')) {
    throw new Error(`unsupported path: ${repoPath}`)
  }
}

function fenceBodies(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n')
  const bodies = []
  let buf = null
  for (const line of lines) {
    if (buf) {
      if (fenceClose.test(line)) {
        bodies.push(buf.join('\n'))
        buf = null
      } else {
        buf.push(line)
      }
    } else if (fenceOpen.test(line)) {
      buf = []
    }
  }
  if (buf) throw new Error('unclosed code fence')
  return bodies
}

import assert from 'node:assert/strict'
import test from 'node:test'
import { rewriteMarkdown } from './rewrite-mftik-markdown.mjs'

const options = {
  repo: 'lynxlinkage/mftik',
  tag: 'v1.0.0',
  pages: ['lifecycle', 'examples'],
}

test('keeps links to published pages', () => {
  const input = 'See [Lifecycle](./lifecycle.md#order).\n'
  assert.equal(rewriteMarkdown(input, options), input)
})

test('keeps absolute http links', () => {
  const input = 'See [mftiko](https://github.com/BullionBear/mftiko).\n'
  assert.equal(rewriteMarkdown(input, options), input)
})

test('rewrites a repo path link to the pinned tag', () => {
  const input = 'See [watch](../../examples/python/md_watch/md_watch.py).\n'
  assert.equal(
    rewriteMarkdown(input, options),
    'See [watch](https://github.com/lynxlinkage/mftik/blob/v1.0.0/examples/python/md_watch/md_watch.py).\n',
  )
})

test('turns a citation fence into a blob link and keeps the code', () => {
  const input = [
    'Intro',
    '',
    '```python examples/python/md_watch/md_watch.py:2-3',
    'def on_init(self):',
    '    return None',
    '```',
    '',
  ].join('\n')
  assert.equal(
    rewriteMarkdown(input, options),
    [
      'Intro',
      '',
      '[examples/python/md_watch/md_watch.py:2-3](https://github.com/lynxlinkage/mftik/blob/v1.0.0/examples/python/md_watch/md_watch.py#L2-L3)',
      '',
      '```python',
      'def on_init(self):',
      '    return None',
      '```',
      '',
    ].join('\n'),
  )
})

test('uses a single line anchor when the range is one line', () => {
  const input = ['```bash examples/python/md_watch/README.md:4-4', 'python -m mftik.run md_watch:MdWatch', '```', ''].join(
    '\n',
  )
  const output = rewriteMarkdown(input, options)
  assert.match(output, /README\.md#L4\)/)
  assert.doesNotMatch(output, /#L4-L4/)
  assert.match(output, /python -m mftik\.run md_watch:MdWatch/)
})

test('does not rewrite links inside a code fence', () => {
  const input = ['```text', 'See [file](examples/python/md_watch/md_watch.py).', '```', ''].join('\n')
  assert.equal(rewriteMarkdown(input, options), input)
})

test('rejects a relative link outside the published pages and examples', () => {
  assert.throws(
    () => rewriteMarkdown('See [notes](../DECISIONS.md).\n', options),
    /unsupported relative link/,
  )
})

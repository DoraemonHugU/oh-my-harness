#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const DEFAULT_OUTPUT = '.oh-my-harness/tree.md'
const DEFAULT_EXCLUDES = [
  '.git/**',
  '.worktrees/**',
  '.oh-my-harness/tree.md'
]

function parseArgs(argv) {
  const args = {
    hook: false,
    print: false,
    force: false,
    output: process.env.OH_MY_HARNESS_TREE_OUTPUT || DEFAULT_OUTPUT,
    mode: process.env.OH_MY_HARNESS_TREE_MODE || 'smart'
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--hook') args.hook = true
    else if (arg === '--print') args.print = true
    else if (arg === '--force') args.force = true
    else if (arg === '--output') args.output = argv[++i] || args.output
    else if (arg === '--mode') args.mode = argv[++i] || args.mode
  }
  return args
}

function readStdinJson() {
  if (process.stdin.isTTY) return null
  try {
    const raw = fs.readFileSync(0, 'utf8').trim()
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    ...options
  })
  if (result.status !== 0) return null
  return result.stdout
}

function git(cwd, args) {
  return run('git', ['-C', cwd, ...args])
}

function normalizeRelative(p) {
  return p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/')
}

function getGitRoot(cwd) {
  const out = git(cwd, ['rev-parse', '--show-toplevel'])
  if (!out) return null
  return path.resolve(out.trim())
}

function getGitDir(cwd) {
  const out = git(cwd, ['rev-parse', '--git-dir'])
  if (!out) return null
  const gitDir = out.trim()
  return path.isAbsolute(gitDir) ? gitDir : path.resolve(cwd, gitDir)
}

function getBranch(root) {
  const branch = git(root, ['branch', '--show-current'])?.trim()
  if (branch) return branch
  const fallback = git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])?.trim()
  return fallback || 'unknown'
}

function getCommit(root) {
  return git(root, ['rev-parse', '--short', 'HEAD'])?.trim() || 'unknown'
}

function getFiles(root) {
  const out = spawnSync('git', ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    encoding: 'buffer',
    maxBuffer: 128 * 1024 * 1024
  })
  if (out.status !== 0) return []
  return out.stdout
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map(normalizeRelative)
    .sort((a, b) => a.localeCompare(b))
}

function globToRegExp(pattern) {
  const normalized = normalizeRelative(pattern).replace(/^\/+/, '')
  let re = ''
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i]
    const next = normalized[i + 1]
    if (c === '*' && next === '*') {
      re += '.*'
      i++
    } else if (c === '*') {
      re += '[^/]*'
    } else if (c === '?') {
      re += '[^/]'
    } else {
      re += c.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    }
  }
  return new RegExp(`^${re}$`)
}

function shouldExclude(file, patterns) {
  return patterns.some((pattern) => {
    const p = normalizeRelative(pattern)
    if (!p.includes('*')) return file === p || file.startsWith(`${p.replace(/\/$/, '')}/`)
    return globToRegExp(p).test(file)
  })
}

function buildTree(files) {
  const root = { name: '.', children: new Map(), file: false }
  for (const file of files) {
    const parts = file.split('/').filter(Boolean)
    let node = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (!node.children.has(part)) {
        node.children.set(part, { name: part, children: new Map(), file: i === parts.length - 1 })
      }
      node = node.children.get(part)
      if (i === parts.length - 1) node.file = true
    }
  }
  return root
}

function sortedChildren(node) {
  return [...node.children.values()].sort((a, b) => {
    const aDir = a.children.size > 0
    const bDir = b.children.size > 0
    if (aDir !== bDir) return aDir ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function renderTree(rootLabel, files) {
  if (files.length === 0) return `${rootLabel}\n└── (empty)`

  const root = buildTree(files)
  const lines = [rootLabel]

  function walk(node, prefix) {
    const children = sortedChildren(node)
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const isLast = i === children.length - 1
      const branch = isLast ? '└── ' : '├── '
      const nextPrefix = prefix + (isLast ? '    ' : '│   ')
      const isDir = child.children.size > 0
      lines.push(`${prefix}${branch}${child.name}${isDir ? '/' : ''}`)
      if (isDir) {
        walk(child, nextPrefix)
      }
    }
  }

  walk(root, '')
  return lines.join('\n')
}

function shouldRunForHook(input, args) {
  if (!input || args.force || args.mode === 'always') return true
  return Boolean(input.hook_event_name)
}

function writeIfChanged(filePath, content) {
  if (fs.existsSync(filePath)) {
    const old = fs.readFileSync(filePath, 'utf8')
    if (old === content) return false
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
  return true
}

function withLock(lockPath, fn) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true })
  let fd
  try {
    fd = fs.openSync(lockPath, 'wx')
  } catch {
    return
  }

  try {
    return fn()
  } finally {
    if (fd !== undefined) fs.closeSync(fd)
    fs.rmSync(lockPath, { force: true })
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const input = readStdinJson()
  const cwd = path.resolve(input?.cwd || process.cwd())

  if (!shouldRunForHook(input, args)) return

  const root = getGitRoot(cwd)
  if (!root) return
  const gitDir = getGitDir(cwd)
  if (!gitDir) return

  const lockPath = path.join(gitDir, 'oh-my-harness-tree.lock')
  const result = withLock(lockPath, () => {
    const outputRelative = normalizeRelative(args.output || DEFAULT_OUTPUT)
    const outputPath = path.join(root, outputRelative)
    const excludes = DEFAULT_EXCLUDES

    const rawFiles = getFiles(root)
    const files = rawFiles.filter((file) => !shouldExclude(file, excludes))

    const sections = [
      '# Tree',
      '',
      'Use this file for navigation only. Verify implementation details by reading source files directly.',
      '',
      '- Source: `git ls-files --cached --others --exclude-standard`',
      `- Entries: ${files.length}`,
      '',
      '```text',
      renderTree('./', files),
      '```',
      ''
    ].filter((line) => line !== null).join('\n')

    const changed = writeIfChanged(outputPath, sections)
    return { outputRelative, outputPath, changed }
  })

  if (!result) return

  if (args.print) {
    process.stdout.write(`${result.outputPath}\n`)
    return
  }

}

main()

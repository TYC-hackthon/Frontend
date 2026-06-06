<template>
  <div class="message-renderer" v-html="renderedContent" />
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import hljs from 'highlight.js/lib/common'
  import 'highlight.js/styles/github-dark.css'
  import katex from 'katex'
  import 'katex/dist/katex.min.css'
  import MarkdownIt from 'markdown-it'
  import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs'
  import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
  import type Token from 'markdown-it/lib/token.mjs'

  const props = defineProps<{
    content: string
  }>()

  const renderMath = (content: string, displayMode: boolean) =>
    katex.renderToString(content, {
      displayMode,
      output: 'html',
      strict: false,
      throwOnError: false,
      trust: false,
    })

  const escapeHtml = (content: string) =>
    content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const highlightCode = (content: string, language: string): string => {
    const trimmedLanguage = language.trim()

    if (trimmedLanguage && hljs.getLanguage(trimmedLanguage)) {
      try {
        return hljs.highlight(content, {
          language: trimmedLanguage,
          ignoreIllegals: true,
        }).value
      } catch {
        return escapeHtml(content)
      }
    }

    return hljs.highlightAuto(content).value
  }

  const markdown: MarkdownIt = new MarkdownIt({
    breaks: true,
    html: false,
    linkify: true,
    typographer: true,
    highlight: highlightCode,
  })

  const mathBlockRule = (
    state: StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean,
  ) => {
    const start = state.bMarks[startLine] + state.tShift[startLine]
    const max = state.eMarks[startLine]

    if (state.src.slice(start, start + 2) !== '$$') return false

    let nextLine = startLine
    let content = state.src.slice(start + 2, max)
    let found = false

    if (content.trimEnd().endsWith('$$')) {
      content = content.trimEnd().slice(0, -2)
      found = true
    }

    while (!found) {
      nextLine += 1
      if (nextLine >= endLine) return false

      const lineStart = state.bMarks[nextLine] + state.tShift[nextLine]
      const lineEnd = state.eMarks[nextLine]
      const line = state.src.slice(lineStart, lineEnd)
      const closeIndex = line.indexOf('$$')

      if (closeIndex >= 0) {
        content += `\n${line.slice(0, closeIndex)}`
        found = true
        break
      }

      content += `\n${line}`
    }

    if (silent) return true

    const token = state.push('math_block', 'section', 0)
    token.block = true
    token.content = content.trim()
    token.map = [startLine, nextLine + 1]
    state.line = nextLine + 1

    return true
  }

  const inlineMathRule = (state: StateInline, silent: boolean) => {
    const marker = state.src[state.pos]
    if (marker !== '$') return false
    if (state.src[state.pos + 1] === '$') return false

    const closeIndex = state.src.indexOf('$', state.pos + 1)
    if (closeIndex < 0) return false

    const content = state.src.slice(state.pos + 1, closeIndex)
    if (!content.trim()) return false

    if (!silent) {
      const token = state.push('math_inline', 'span', 0)
      token.content = content
    }

    state.pos = closeIndex + 1
    return true
  }

  const bracketMathRule = (state: StateInline, silent: boolean) => {
    const opener = state.src.slice(state.pos, state.pos + 2)
    if (opener !== '\\(' && opener !== '\\[') return false

    const displayMode = opener === '\\['
    const closer = displayMode ? '\\]' : '\\)'
    const closeIndex = state.src.indexOf(closer, state.pos + 2)
    if (closeIndex < 0) return false

    const content = state.src.slice(state.pos + 2, closeIndex)
    if (!content.trim()) return false

    if (!silent) {
      const token = state.push(displayMode ? 'math_block_inline' : 'math_inline', 'span', 0)
      token.content = content
    }

    state.pos = closeIndex + 2
    return true
  }

  markdown.block.ruler.before('fence', 'math_block', mathBlockRule, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  })
  markdown.inline.ruler.before('escape', 'bracket_math', bracketMathRule)
  markdown.inline.ruler.before('emphasis', 'math_inline', inlineMathRule)
  markdown.renderer.rules.math_block = (tokens: Token[], index: number) =>
    `<div class="math-block">${renderMath(tokens[index].content, true)}</div>`
  markdown.renderer.rules.math_block_inline = (tokens: Token[], index: number) =>
    `<div class="math-block">${renderMath(tokens[index].content, true)}</div>`
  markdown.renderer.rules.math_inline = (tokens: Token[], index: number) =>
    `<span class="math-inline">${renderMath(tokens[index].content, false)}</span>`
  markdown.renderer.rules.link_open = (
    tokens: Token[],
    index: number,
    options: any,
    env: unknown,
    self: any,
  ) => {
    const token = tokens[index]
    const targetIndex = token.attrIndex('target')
    const relIndex = token.attrIndex('rel')

    if (targetIndex < 0) token.attrPush(['target', '_blank'])
    else token.attrs![targetIndex][1] = '_blank'

    if (relIndex < 0) token.attrPush(['rel', 'noopener noreferrer'])
    else token.attrs![relIndex][1] = 'noopener noreferrer'

    return self.renderToken(tokens, index, options)
  }

  const renderedContent = computed(() => markdown.render(props.content))
</script>

<style scoped>
  .message-renderer {
    color: inherit;
    line-height: 1.58;
    overflow-wrap: anywhere;
  }

  .message-renderer :deep(*) {
    max-width: 100%;
  }

  .message-renderer :deep(p),
  .message-renderer :deep(ul),
  .message-renderer :deep(ol),
  .message-renderer :deep(pre),
  .message-renderer :deep(blockquote),
  .message-renderer :deep(table),
  .message-renderer :deep(.math-block) {
    margin: 0 0 12px;
  }

  .message-renderer :deep(p:last-child),
  .message-renderer :deep(ul:last-child),
  .message-renderer :deep(ol:last-child),
  .message-renderer :deep(pre:last-child),
  .message-renderer :deep(blockquote:last-child),
  .message-renderer :deep(table:last-child),
  .message-renderer :deep(.math-block:last-child) {
    margin-bottom: 0;
  }

  .message-renderer :deep(a) {
    color: #67e8f9;
    font-weight: 800;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .message-renderer :deep(strong) {
    font-weight: 900;
  }

  .message-renderer :deep(ul),
  .message-renderer :deep(ol) {
    padding-left: 1.3rem;
  }

  .message-renderer :deep(li + li) {
    margin-top: 4px;
  }

  .message-renderer :deep(blockquote) {
    border-left: 3px solid rgba(125, 211, 252, 0.65);
    color: rgba(248, 250, 252, 0.84);
    padding-left: 12px;
  }

  .message-renderer :deep(code) {
    background: rgba(2, 6, 23, 0.42);
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 6px;
    color: #e0f2fe;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    font-size: 0.92em;
    padding: 1px 5px;
  }

  .message-renderer :deep(pre) {
    background: #020617;
    border: 1px solid rgba(148, 163, 184, 0.24);
    border-radius: 8px;
    color: #e5e7eb;
    overflow-x: auto;
    padding: 12px;
  }

  .message-renderer :deep(pre code) {
    background: transparent;
    border: 0;
    border-radius: 0;
    color: inherit;
    display: block;
    font-size: 0.84rem;
    line-height: 1.55;
    padding: 0;
    white-space: pre;
  }

  .message-renderer :deep(table) {
    border-collapse: collapse;
    display: block;
    overflow-x: auto;
    width: max-content;
  }

  .message-renderer :deep(th),
  .message-renderer :deep(td) {
    border: 1px solid rgba(148, 163, 184, 0.28);
    padding: 6px 9px;
    text-align: left;
  }

  .message-renderer :deep(th) {
    background: rgba(148, 163, 184, 0.16);
    font-weight: 900;
  }

  .message-renderer :deep(.math-block) {
    overflow-x: auto;
    overflow-y: hidden;
    padding: 4px 0;
  }

  .message-renderer :deep(.katex) {
    color: inherit;
    font-size: 1.04em;
  }
</style>

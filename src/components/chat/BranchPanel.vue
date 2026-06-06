<template>
  <aside class="workspace-panel branch-panel">
    <header class="panel-header branch-header">
      <div>
        <p class="eyebrow">Branch</p>
        <h2>{{ currentNodeLabel }}</h2>
      </div>

      <div class="branch-tools">
        <v-tooltip text="New root" location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              aria-label="New root"
              class="icon-action"
              icon="mdi-source-branch-plus"
              variant="flat"
              @click="emit('startRoot')"
            />
          </template>
        </v-tooltip>

        <v-tooltip text="Refresh tree" location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              aria-label="Refresh tree"
              class="icon-action"
              :disabled="isLoadingTree"
              icon="mdi-refresh"
              :loading="isLoadingTree"
              variant="flat"
              @click="emit('refreshTree')"
            />
          </template>
        </v-tooltip>

        <v-tooltip text="Clear database" location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              aria-label="Clear database"
              class="icon-action danger-action"
              :disabled="isClearingDatabase || treeNodes.length === 0"
              icon="mdi-trash-can-outline"
              :loading="isClearingDatabase"
              variant="flat"
              @click="emit('clearRequested')"
            />
          </template>
        </v-tooltip>
      </div>
    </header>

    <div class="branch-summary">
      <div>
        <span>{{ treeRoots.length }}</span>
        <small>roots</small>
      </div>
      <div>
        <span>{{ treeNodes.length }}</span>
        <small>nodes</small>
      </div>
    </div>

    <div class="branch-tree" :class="{ 'branch-tree--loading': isLoadingTree }">
      <p v-if="treeNodes.length === 0" class="empty-tree">
        No saved nodes
      </p>

      <button
        v-for="item in flattenedTreeNodes"
        :key="item.node.id"
        class="branch-node"
        :class="{
          'branch-node--active': item.node.id === currentNodeId,
          'branch-node--assistant': item.node.role === 'assistant',
          'branch-node--exchange': item.node.role === 'exchange',
        }"
        :disabled="isLoadingContext"
        :style="{ '--node-depth': item.depth }"
        type="button"
        @click="emit('selectNode', item.node.id)"
      >
        <span class="branch-node__rail" />
        <span class="branch-node__content">
          <span class="branch-node__meta">
            <v-icon :icon="nodeIcon(item.node)" size="16" />
            <span>{{ item.node.role }}</span>
            <span>#{{ item.node.id }}</span>
          </span>
          <span class="branch-node__preview">{{ nodePreview(item.node) }}</span>
        </span>
        <v-icon
          v-if="item.node.children.length > 0"
          class="branch-node__children"
          icon="mdi-source-branch"
          size="16"
        />
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
  import type { FlattenedNode, MessageNode } from '@/types/chat'

  defineProps<{
    currentNodeId: number | null
    currentNodeLabel: string
    flattenedTreeNodes: FlattenedNode[]
    isClearingDatabase: boolean
    isLoadingContext: boolean
    isLoadingTree: boolean
    treeNodes: MessageNode[]
    treeRoots: number[]
  }>()

  const emit = defineEmits<{
    clearRequested: []
    refreshTree: []
    selectNode: [nodeId: number]
    startRoot: []
  }>()

  const nodePreview = (node: MessageNode) => {
    const compact = [node.user_content, node.assistant_content]
      .filter(Boolean)
      .join(' / ')
      .trim() || node.content
    const normalized = compact.replace(/\s+/g, ' ').trim()
    if (!normalized) return '(empty)'
    return normalized.length > 72 ? `${normalized.slice(0, 72)}...` : normalized
  }

  const nodeIcon = (node: MessageNode) => {
    if (node.role === 'exchange') return 'mdi-swap-horizontal'
    return node.role === 'user' ? 'mdi-account' : 'mdi-robot'
  }
</script>

<style scoped>
  .workspace-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: var(--shadow);
    color: var(--text-strong);
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .branch-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
    overflow: hidden;
    padding: 18px;
  }

  .panel-header {
    align-items: center;
    display: flex;
    gap: 14px;
    justify-content: space-between;
  }

  .branch-header {
    border-bottom: 1px solid var(--border-soft);
    margin: -2px 0 0;
    padding-bottom: 14px;
  }

  .branch-tools {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    gap: 8px;
  }

  .eyebrow {
    color: var(--text-muted);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    margin: 0 0 4px;
    text-transform: uppercase;
  }

  h2 {
    color: var(--text-strong);
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1.15;
    margin: 0;
  }

  .icon-action {
    background: var(--icon-button-bg);
    border-radius: 8px;
    box-shadow: none;
    color: var(--icon-button-text);
    font-weight: 800;
    height: 38px;
    letter-spacing: 0;
    min-width: 38px;
    text-transform: none;
    width: 38px;
  }

  .icon-action :deep(.v-btn__content),
  .icon-action :deep(.v-icon) {
    color: var(--icon-button-text);
  }

  .icon-action:hover {
    background: var(--icon-button-hover);
  }

  .danger-action {
    background: var(--danger-bg);
    border: 1px solid var(--danger-border);
    color: var(--danger-text);
  }

  .danger-action :deep(.v-btn__content),
  .danger-action :deep(.v-icon) {
    color: var(--danger-text);
  }

  .danger-action:hover {
    background: var(--danger-bg-hover);
  }

  .branch-summary {
    background: var(--surface-raised);
    border: 1px solid var(--border-soft);
    border-radius: 8px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    overflow: hidden;
  }

  .branch-summary div {
    display: grid;
    gap: 2px;
    padding: 12px;
  }

  .branch-summary div + div {
    border-left: 1px solid var(--border-soft);
  }

  .branch-summary span {
    color: var(--text-strong);
    font-size: 1.25rem;
    font-weight: 900;
    line-height: 1;
  }

  .branch-summary small {
    color: var(--text-subtle);
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .branch-tree {
    align-content: start;
    display: grid;
    flex: 1;
    gap: 8px;
    height: 100%;
    max-height: 100%;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 2px;
    transition: opacity 0.18s ease;
  }

  .branch-tree--loading {
    opacity: 0.64;
  }

  .empty-tree {
    align-self: center;
    color: var(--text-subtle);
    font-weight: 800;
    margin: 0;
    text-align: center;
  }

  .branch-node {
    --node-depth: 0;
    align-items: center;
    background: var(--field-bg);
    border: 1px solid var(--border-soft);
    border-radius: 8px;
    color: var(--text-strong);
    cursor: pointer;
    display: grid;
    gap: 8px;
    grid-template-columns: 4px minmax(0, 1fr) auto;
    margin-left: calc(var(--node-depth) * 14px);
    min-height: 58px;
    padding: 9px 10px;
    text-align: left;
    width: calc(100% - (var(--node-depth) * 14px));
  }

  .branch-node:disabled {
    cursor: progress;
  }

  .branch-node:hover:not(:disabled),
  .branch-node--active {
    background: var(--primary-node-bg);
    border-color: var(--primary);
  }

  .branch-node--assistant:hover:not(:disabled),
  .branch-node--assistant.branch-node--active {
    background: var(--assistant-node-bg);
    border-color: var(--assistant-accent);
  }

  .branch-node--exchange:hover:not(:disabled),
  .branch-node--exchange.branch-node--active {
    background: var(--exchange-node-bg);
    border-color: var(--exchange-accent);
  }

  .branch-node__rail {
    align-self: stretch;
    background: var(--primary);
    border-radius: 999px;
  }

  .branch-node--assistant .branch-node__rail {
    background: var(--assistant-accent);
  }

  .branch-node--exchange .branch-node__rail {
    background: var(--exchange-accent);
  }

  .branch-node__content {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .branch-node__meta {
    align-items: center;
    color: var(--text-subtle);
    display: flex;
    gap: 6px;
    font-size: 0.72rem;
    font-weight: 900;
    text-transform: uppercase;
  }

  .branch-node__preview {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .branch-node__children {
    color: var(--text-subtle);
  }

  @media (max-width: 1180px) {
    .branch-panel {
      grid-column: 1 / -1;
      min-height: 0;
    }

    .branch-tree {
      max-height: none;
    }
  }

  @media (max-width: 820px) {
    .branch-panel {
      overflow: hidden;
      padding: 16px;
    }
  }
</style>

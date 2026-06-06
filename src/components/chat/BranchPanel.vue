<template>
  <aside class="workspace-panel branch-panel">
    <header class="panel-header branch-header">
      <div>
        <p class="eyebrow">Branch</p>
        <h2>{{ currentNodeLabel }}</h2>
      </div>

      <div v-if="showHeaderActions" class="branch-tools">
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

        <v-tooltip text="Clear history" location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              aria-label="Clear history"
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

    <div v-if="showSummary" class="branch-summary">
      <div>
        <span>{{ treeRoots.length }}</span>
        <small>roots</small>
      </div>
      <div>
        <span>{{ treeNodes.length }}</span>
        <small>nodes</small>
      </div>
    </div>

    <div
      v-if="showRootSwitcher && (treeRootOptions.length > 0 || isNewRootDraftActive)"
      aria-label="Root trees"
      class="root-switcher"
      role="tablist"
    >
      <button
        aria-label="New root"
        :aria-selected="isNewRootDraftActive"
        class="root-switcher__button root-switcher__button--new"
        :class="{ 'root-switcher__button--active': isNewRootDraftActive }"
        :disabled="isLoadingContext"
        role="tab"
        type="button"
        @click="emit('startRoot')"
      >
        <v-icon icon="mdi-plus" size="15" />
        <span>New</span>
      </button>

      <button
        v-for="option in treeRootOptions"
        :key="option.id"
        :aria-label="`Open ${option.label}`"
        :aria-selected="option.isCurrent"
        class="root-switcher__button"
        :class="{ 'root-switcher__button--active': option.isCurrent }"
        :disabled="isLoadingContext"
        role="tab"
        type="button"
        @click="emit('selectRootTree', option.id)"
      >
        <span class="root-switcher__label">{{ option.label }}</span>
        <span class="root-switcher__preview">{{ option.preview }}</span>
      </button>
    </div>

    <div class="branch-tree" :class="{ 'branch-tree--loading': isLoadingTree }">
      <p v-if="flattenedTreeNodes.length === 0" class="empty-tree">
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
        :style="branchNodeStyle(item)"
        type="button"
        @click="emit('selectNode', item.node.id)"
      >
        <span
          aria-hidden="true"
          class="branch-node__graph"
          :style="graphGridStyle(item)"
        >
          <span
            v-for="forkLane in forkLanesForPaint(item)"
            :key="forkLane"
            class="branch-node__fork"
            :style="forkLineStyle(item, forkLane)"
          />
          <span
            v-for="lane in item.graphLanes"
            :key="lane.index"
            class="branch-graph__lane"
            :class="graphLaneClasses(lane, item)"
            :style="graphLaneStyle(lane)"
          >
            <span v-if="lane.isNode" class="branch-graph__dot" />
          </span>
        </span>
        <span class="branch-node__content">
          <span class="branch-node__meta">
            <v-icon :icon="nodeIcon(item.node)" size="16" />
            <span>{{ item.node.role }}</span>
            <span>#{{ item.node.id }}</span>
          </span>
          <span class="branch-node__preview">{{ nodePreview(item.node) }}</span>
        </span>
        <v-icon
          v-if="item.hasChildren"
          class="branch-node__children"
          icon="mdi-source-branch"
          size="16"
        />
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
  import type { FlattenedNode, GraphLane, MessageNode, RootTreeOption } from '@/types/chat'

  withDefaults(defineProps<{
    currentNodeId: number | null
    currentNodeLabel: string
    flattenedTreeNodes: FlattenedNode[]
    isClearingDatabase: boolean
    isLoadingContext: boolean
    isLoadingTree: boolean
    isNewRootDraftActive: boolean
    showHeaderActions?: boolean
    showRootSwitcher?: boolean
    showSummary?: boolean
    treeRootOptions: RootTreeOption[]
    treeNodes: MessageNode[]
    treeRoots: number[]
  }>(), {
    showHeaderActions: true,
    showRootSwitcher: true,
    showSummary: true,
  })

  const emit = defineEmits<{
    clearRequested: []
    refreshTree: []
    selectNode: [nodeId: number]
    selectRootTree: [rootId: number]
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

  const branchNodeStyle = (item: FlattenedNode) => ({
    '--node-active-bg': item.branchRingColor,
    '--node-accent': item.branchColor,
    '--node-active-ring': item.branchRingColor,
  })

  const graphGridStyle = (item: FlattenedNode) => ({
    gridTemplateColumns: `repeat(${item.graphColumnCount}, var(--graph-lane-width))`,
    width: `calc(${item.graphColumnCount} * var(--graph-lane-width))`,
  })

  const forkLanesForPaint = (item: FlattenedNode) =>
    [...item.forkLanes].sort((left, right) =>
      Math.abs(right - item.lane) - Math.abs(left - item.lane)
    )

  const forkLineStyle = (item: FlattenedNode, forkLane: number) => {
    const firstLane = Math.min(item.lane, forkLane)
    const lastLane = Math.max(item.lane, forkLane)
    const targetLane = item.graphLanes.find(lane => lane.index === forkLane)

    return {
      background: targetLane?.color ?? item.branchColor,
      left: `calc((${firstLane} * var(--graph-lane-width)) + (var(--graph-lane-width) / 2))`,
      width: `calc(${lastLane - firstLane} * var(--graph-lane-width))`,
    }
  }

  const graphLaneClasses = (lane: GraphLane, item: FlattenedNode) => ({
    'branch-graph__lane--fork-target': lane.isForkTarget,
    'branch-graph__lane--leaf': lane.isNode && !item.hasChildren,
    'branch-graph__lane--node': lane.isNode,
    'branch-graph__lane--root': lane.isNode && item.parentLane === null,
    'branch-graph__lane--through': lane.isThrough,
  })

  const graphLaneStyle = (lane: GraphLane) => ({
    '--lane-color': lane.color,
  })
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

  .root-switcher {
    align-items: stretch;
    background: var(--surface-raised);
    border: 1px solid var(--border-soft);
    border-radius: 8px;
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding: 4px;
  }

  .root-switcher__button {
    align-items: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--text-subtle);
    cursor: pointer;
    display: grid;
    flex: 0 0 auto;
    gap: 2px;
    min-height: 42px;
    min-width: 82px;
    padding: 6px 9px;
    text-align: left;
  }

  .root-switcher__button--new {
    align-content: center;
    grid-auto-flow: column;
    justify-content: center;
    min-width: 70px;
  }

  .root-switcher__button:disabled {
    cursor: progress;
  }

  .root-switcher__button:hover:not(:disabled),
  .root-switcher__button--active {
    background: rgba(45, 212, 191, 0.12);
    border-color: rgba(45, 212, 191, 0.38);
    color: var(--text-strong);
  }

  .root-switcher__label {
    color: inherit;
    font-size: 0.74rem;
    font-weight: 900;
    line-height: 1;
    text-transform: uppercase;
  }

  .root-switcher__preview {
    color: var(--text-subtle);
    font-size: 0.72rem;
    line-height: 1.2;
    max-width: 112px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .branch-tree {
    align-content: start;
    display: grid;
    flex: 1;
    gap: 0;
    height: 100%;
    max-height: 100%;
    min-height: 0;
    overflow-x: auto;
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
    --graph-lane-width: 18px;
    --graph-line: rgba(148, 163, 184, 0.42);
    --node-active-bg: rgba(20, 184, 166, 0.16);
    --node-active-ring: rgba(20, 184, 166, 0.28);
    --node-accent: var(--primary);
    align-items: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: var(--text-strong);
    cursor: pointer;
    display: grid;
    gap: 10px;
    grid-template-columns: auto minmax(0, 1fr) 18px;
    min-height: 54px;
    min-width: 220px;
    padding: 0 8px 0 2px;
    text-align: left;
    width: 100%;
  }

  .branch-node:disabled {
    cursor: progress;
  }

  .branch-node:hover:not(:disabled),
  .branch-node--active {
    background: var(--node-active-bg);
    border-color: var(--node-accent);
  }

  .branch-node__graph {
    align-self: stretch;
    display: grid;
    min-height: 54px;
    position: relative;
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

  .branch-node__fork {
    background: var(--node-accent);
    border-radius: 999px;
    height: 2px;
    opacity: 0.78;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 0;
  }

  .branch-node:hover:not(:disabled) .branch-node__fork,
  .branch-node--active .branch-node__fork {
    opacity: 1;
  }

  .branch-graph__lane {
    --lane-color: var(--graph-line);
    min-width: var(--graph-lane-width);
    position: relative;
    z-index: 1;
  }

  .branch-graph__lane::before {
    background: var(--graph-line);
    border-radius: 999px;
    bottom: 0;
    content: "";
    display: none;
    left: 50%;
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    width: 2px;
  }

  .branch-graph__lane--through::before {
    background: var(--lane-color);
    display: block;
    opacity: 0.74;
  }

  .branch-graph__lane--fork-target::before {
    background: var(--lane-color);
    bottom: 0;
    display: block;
    opacity: 0.82;
    top: 50%;
  }

  .branch-graph__lane--node::before {
    background: var(--lane-color);
    bottom: 0;
    display: block;
    top: 0;
  }

  .branch-graph__lane--node.branch-graph__lane--root::before {
    top: 50%;
  }

  .branch-graph__lane--node.branch-graph__lane--leaf::before {
    bottom: 50%;
  }

  .branch-graph__lane--node.branch-graph__lane--leaf.branch-graph__lane--root::before {
    display: none;
  }

  .branch-graph__dot {
    background: var(--surface);
    border: 3px solid var(--node-accent);
    border-radius: 999px;
    box-shadow: 0 0 0 3px var(--surface);
    height: 13px;
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 13px;
    z-index: 2;
  }

  .branch-node:hover:not(:disabled) .branch-graph__dot,
  .branch-node--active .branch-graph__dot {
    background: var(--node-accent);
    box-shadow: 0 0 0 3px var(--surface), 0 0 0 6px var(--node-active-ring);
  }

  @media (max-width: 1420px) {
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

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="graph-firework"
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen branch graph"
    >
      <div class="graph-firework__stage">
        <svg
          class="graph-firework__lines"
          :viewBox="`0 0 ${stageWidth} ${stageHeight}`"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <line
            v-for="line in lines"
            :key="line.id"
            class="graph-firework__line"
            :style="{ animationDelay: `${line.delay}ms`, stroke: line.color }"
            :x1="line.x1"
            :x2="line.x2"
            :y1="line.y1"
            :y2="line.y2"
          />
        </svg>

        <button
          v-for="node in graphNodes"
          :key="node.id"
          class="graph-firework__node"
          :class="{ 'graph-firework__node--root': node.isRoot }"
          :style="nodeStyle(node)"
          type="button"
          @click="emit('selectNode', node.id)"
        >
          <span class="graph-firework__node-id">#{{ node.id }}</span>
          <span class="graph-firework__node-text">{{ node.preview }}</span>
        </button>
      </div>

      <v-tooltip text="Close" location="left">
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="tooltipProps"
            aria-label="Close fullscreen graph"
            class="graph-firework__close"
            icon="mdi-close"
            variant="flat"
            @click="emit('update:modelValue', false)"
          />
        </template>
      </v-tooltip>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { FlattenedNode } from '@/types/chat'

  type FireworkNode = {
    color: string
    delay: number
    id: number
    isRoot: boolean
    preview: string
    startX: number
    startY: number
    x: number
    y: number
  }

  type FireworkLine = {
    color: string
    delay: number
    id: string
    x1: number
    x2: number
    y1: number
    y2: number
  }

  const props = defineProps<{
    flattenedTreeNodes: FlattenedNode[]
    modelValue: boolean
  }>()

  const emit = defineEmits<{
    selectNode: [nodeId: number]
    'update:modelValue': [value: boolean]
  }>()

  const stageWidth = 1200
  const stageHeight = 760
  const rootY = stageHeight / 2

  const previewText = (item: FlattenedNode) => {
    const compact = [item.node.user_content, item.node.assistant_content]
      .filter(Boolean)
      .join(' / ')
      .trim() || item.node.content
    const normalized = compact.replace(/\s+/g, ' ').trim()
    if (!normalized) return item.node.role
    return normalized.length > 54 ? `${normalized.slice(0, 54)}...` : normalized
  }

  const graphNodes = computed<FireworkNode[]>(() => {
    const items = props.flattenedTreeNodes
    if (items.length === 0) return []

    const itemById = new Map(items.map(item => [item.node.id, item]))
    const childrenByParent = new Map<number | null, FlattenedNode[]>()

    for (const item of items) {
      const children = childrenByParent.get(item.node.parent_id) ?? []
      children.push(item)
      childrenByParent.set(item.node.parent_id, children)
    }

    const root = items[0]
    const orderedItems: FlattenedNode[] = []
    const queue: FlattenedNode[] = [root]
    const visited = new Set<number>()

    while (queue.length > 0) {
      const item = queue.shift()
      if (!item || visited.has(item.node.id)) continue

      visited.add(item.node.id)
      orderedItems.push(item)

      const children = (childrenByParent.get(item.node.id) ?? [])
        .filter(child => itemById.has(child.node.id))
        .sort((left, right) => left.node.id - right.node.id)
      queue.push(...children)
    }

    const bfsIndexById = new Map(orderedItems.map((item, index) => [item.node.id, index]))
    const nodesByDepth = new Map<number, FlattenedNode[]>()

    for (const item of orderedItems) {
      const depthNodes = nodesByDepth.get(item.depth) ?? []
      depthNodes.push(item)
      nodesByDepth.set(item.depth, depthNodes)
    }

    const maxDepth = Math.max(...orderedItems.map(item => item.depth), 0)
    const columnWidth = maxDepth === 0 ? 0 : (stageWidth - 240) / maxDepth

    return orderedItems.map(item => {
      const depthNodes = nodesByDepth.get(item.depth) ?? [item]
      const depthIndex = depthNodes.findIndex(depthItem => depthItem.node.id === item.node.id)
      const depthCount = depthNodes.length
      const verticalGap = Math.min(118, Math.max(70, (stageHeight - 160) / Math.max(depthCount, 1)))
      const x = 100 + item.depth * columnWidth
      const y = rootY - ((depthCount - 1) * verticalGap) / 2 + depthIndex * verticalGap
      const boundedX = Math.min(Math.max(x, 92), stageWidth - 136)
      const boundedY = Math.min(Math.max(y, 76), stageHeight - 76)
      const bfsIndex = bfsIndexById.get(item.node.id) ?? 0

      if (item.node.parent_id === null) {
        return {
          color: item.branchColor,
          delay: 0,
          id: item.node.id,
          isRoot: true,
          preview: previewText(item),
          startX: 0,
          startY: 0,
          x: boundedX,
          y: boundedY,
        }
      }

      return {
        color: item.branchColor,
        delay: Math.min(bfsIndex * 86, 1100),
        id: item.node.id,
        isRoot: false,
        preview: previewText(item),
        startX: -Math.max(90, boundedX - 100),
        startY: 0,
        x: boundedX,
        y: boundedY,
      }
    })
  })

  const nodeById = computed(() => new Map(graphNodes.value.map(node => [node.id, node])))

  const lines = computed<FireworkLine[]>(() =>
    props.flattenedTreeNodes.flatMap(item => {
      if (item.node.parent_id === null) return []
      const node = nodeById.value.get(item.node.id)
      const parent = nodeById.value.get(item.node.parent_id)
      if (!node || !parent) return []

      return [{
        color: node.color,
        delay: node.delay + 80,
        id: `${item.node.parent_id}-${item.node.id}`,
        x1: parent.x,
        x2: node.x,
        y1: parent.y,
        y2: node.y,
      }]
    })
  )

  const nodeStyle = (node: FireworkNode) => ({
    '--node-color': node.color,
    '--node-delay': `${node.delay}ms`,
    '--start-x': `${node.startX}px`,
    '--start-y': `${node.startY}px`,
    left: `${(node.x / stageWidth) * 100}%`,
    top: `${(node.y / stageHeight) * 100}%`,
  })
</script>

<style scoped>
  .graph-firework {
    background:
      radial-gradient(circle at 50% 50%, rgba(20, 184, 166, 0.16), transparent 34%),
      radial-gradient(circle at 72% 28%, rgba(129, 140, 248, 0.12), transparent 28%),
      rgba(2, 6, 23, 0.96);
    color: #f8fafc;
    inset: 0;
    overflow: hidden;
    position: fixed;
    z-index: 4000;
  }

  .graph-firework__stage {
    height: 100%;
    position: relative;
    width: 100%;
  }

  .graph-firework__lines {
    height: 100%;
    inset: 0;
    position: absolute;
    width: 100%;
  }

  .graph-firework__line {
    animation: firework-line 840ms ease-out both;
    stroke-linecap: round;
    stroke-width: 4;
    transform-box: fill-box;
    transform-origin: center;
  }

  .graph-firework__node {
    --node-color: #2dd4bf;
    --node-delay: 0ms;
    --start-x: 0px;
    --start-y: 0px;
    animation: firework-node 760ms cubic-bezier(0.18, 0.84, 0.28, 1.12) both;
    animation-delay: var(--node-delay);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent),
      rgba(15, 23, 42, 0.92);
    border: 1px solid color-mix(in srgb, var(--node-color) 72%, transparent);
    border-radius: 8px;
    box-shadow:
      0 0 24px color-mix(in srgb, var(--node-color) 48%, transparent),
      0 18px 44px rgba(0, 0, 0, 0.36);
    color: #f8fafc;
    cursor: pointer;
    display: grid;
    gap: 3px;
    max-width: 46px;
    min-height: 42px;
    min-width: 46px;
    padding: 10px;
    position: absolute;
    text-align: left;
    transform: translate(-50%, -50%);
    transition: border-color 0.16s ease, max-width 0.18s ease, min-width 0.18s ease;
  }

  .graph-firework__node:hover,
  .graph-firework__node:focus-visible {
    border-color: #ffffff;
    max-width: 220px;
    min-width: 150px;
  }

  .graph-firework__node--root {
    background:
      linear-gradient(180deg, rgba(45, 212, 191, 0.28), transparent),
      rgba(13, 148, 136, 0.92);
  }

  .graph-firework__node-id {
    color: color-mix(in srgb, var(--node-color) 74%, #ffffff);
    font-size: 0.76rem;
    font-weight: 900;
    line-height: 1;
  }

  .graph-firework__node-text {
    color: #e2e8f0;
    display: -webkit-box;
    font-size: 0.82rem;
    font-weight: 700;
    line-height: 1.25;
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    transition: max-height 0.16s ease, opacity 0.16s ease;
  }

  .graph-firework__node:hover .graph-firework__node-text,
  .graph-firework__node:focus-visible .graph-firework__node-text {
    max-height: 44px;
    opacity: 1;
  }

  .graph-firework__close {
    background: rgba(15, 23, 42, 0.86);
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 8px;
    color: #f8fafc;
    height: 40px;
    min-width: 40px;
    position: fixed;
    right: 18px;
    top: 18px;
    width: 40px;
    z-index: 2;
  }

  .graph-firework__close :deep(.v-btn__content),
  .graph-firework__close :deep(.v-icon) {
    color: #f8fafc;
  }

  @keyframes firework-node {
    0% {
      opacity: 0;
      transform: translate(calc(-50% + var(--start-x)), calc(-50% + var(--start-y))) scale(0.18);
    }

    68% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.08);
    }

    100% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  @keyframes firework-line {
    0% {
      opacity: 0;
      stroke-dasharray: 1 900;
    }

    100% {
      opacity: 0.86;
      stroke-dasharray: 900 1;
    }
  }

  @media (max-width: 720px) {
    .graph-firework__node {
      max-width: 150px;
      min-width: 112px;
      padding: 8px 9px;
    }

    .graph-firework__node:not(:hover):not(:focus-visible) {
      max-width: 42px;
      min-width: 42px;
    }

    .graph-firework__node-text {
      font-size: 0.74rem;
    }
  }
</style>

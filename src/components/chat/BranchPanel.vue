<template>
  <aside class="workspace-panel branch-panel">
    <header class="panel-header branch-header">
      <div class="branch-header-title">
        <p class="eyebrow">Branch</p>
        <h2>{{ currentNodeLabel }}</h2>
      </div>

      <div v-if="showHeaderActions || showFireworkAction || currentNodeId !== null" class="branch-tools">
        <v-tooltip v-if="showFireworkAction" text="Fullscreen burst" location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              aria-label="Open fullscreen branch burst"
              class="icon-action burst-action"
              :disabled="flattenedTreeNodes.length === 0"
              icon="mdi-firework"
              variant="flat"
              @click="emit('burstGraph')"
            />
          </template>
        </v-tooltip>

        <v-tooltip text="Merge branches" location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              aria-label="Merge branches"
              class="icon-action"
              :disabled="currentNodeId === null"
              icon="mdi-source-merge"
              variant="flat"
              @click="emit('mergeStart')"
            />
          </template>
        </v-tooltip>


        <v-tooltip text="Compare similarity" location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              aria-label="Compare similarity"
              class="icon-action"
              :disabled="currentNodeId === null"
              icon="mdi-compare"
              variant="flat"
              @click="emit('compareStart')"
            />
          </template>
        </v-tooltip>

        <v-tooltip v-if="showHeaderActions" text="Refresh tree" location="bottom">
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



    <div class="branch-tree" :class="{ 'branch-tree--loading': isLoadingTree }">
      <div v-if="isMergeMode" class="merge-banner">
        <span>Select the second node to merge with Node #{{ mergeSourceNodeId }}</span>
        <v-btn
          variant="text"
          size="small"
          class="cancel-merge-btn"
          @click="emit('mergeCancelled')"
        >
          Cancel
        </v-btn>
      </div>

      <div v-if="isCompareMode" class="merge-banner compare-banner">
        <span>Select a node to compare with Node #{{ compareSourceNodeId }}</span>
        <v-btn
          variant="text"
          size="small"
          class="cancel-merge-btn"
          @click="emit('compareCancelled')"
        >
          Cancel
        </v-btn>
      </div>

      <p v-if="flattenedTreeNodes.length === 0" class="empty-tree">
        No saved nodes
      </p>

      <v-tooltip
        v-for="item in flattenedTreeNodes"
        :key="item.node.id"
        location="left"
        :disabled="!item.branchInfo || (!item.branchInfo.summary && (!item.branchInfo.tags || item.branchInfo.tags.length === 0))"
      >
        <template #activator="{ props: tooltipProps }">
          <button
            v-bind="tooltipProps"
            class="branch-node"
            :class="{
              'branch-node--active': item.node.id === currentNodeId,
              'branch-node--assistant': item.node.role === 'assistant',
              'branch-node--exchange': item.node.role === 'exchange',
              'branch-node--merge': item.node.role === 'merge',
            }"
            :disabled="isLoadingContext"
            :style="branchNodeStyle(item)"
            type="button"
            @click="isMergeMode ? emit('mergeTarget', item.node.id) : (isCompareMode ? emit('compareTarget', item.node.id) : emit('selectNode', item.node.id))"
          >
        <span
          aria-hidden="true"
          class="branch-node__graph"
          :style="graphGridStyle(item)"
        >
          <span
            v-for="forkLane in forkLanesForPaint(item)"
            :key="'fork-' + forkLane"
            class="branch-node__fork"
            :style="forkLineStyle(item, forkLane)"
          />
          <span
            v-for="mergeLane in mergeLanesForPaint(item)"
            :key="'merge-' + mergeLane"
            class="branch-node__merge-line"
            :style="mergeLineStyle(item, mergeLane)"
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
      </template>
      <div v-if="item.branchInfo" class="branch-tooltip-content">
        <div v-if="item.branchInfo.summary" class="branch-tooltip-summary">{{ item.branchInfo.summary }}</div>
        <div v-if="item.branchInfo.tags && item.branchInfo.tags.length > 0" class="branch-tooltip-tags">
          <span v-for="tag in item.branchInfo.tags" :key="tag" class="branch-tooltip-tag">{{ tag }}</span>
        </div>
      </div>
    </v-tooltip>
    </div>

    <Teleport to="body">
      <!-- The layer carries the drag offset so the pop transition keeps its own transform. -->
      <div ref="suggestionRef" class="merge-suggestion-layer" :style="suggestionStyle">
        <Transition name="suggestion-pop">
          <section
            v-if="isRecommendationOpen && !isCompareMode"
            class="merge-suggestion"
            :class="{ 'merge-suggestion--dragging': isDragging }"
          >
            <header class="merge-suggestion__head" @pointerdown="startDrag">
              <p class="eyebrow">
                <v-icon icon="mdi-drag-horizontal-variant" size="14" />
                Suggested merge
              </p>
              <button
                aria-label="Dismiss suggestion"
                class="merge-suggestion__dismiss"
                type="button"
                @click="emit('dismissRecommendation')"
              >
                <v-icon icon="mdi-close" size="14" />
              </button>
            </header>

            <div v-if="!mergeRecommendation" class="merge-suggestion__status">
              <v-progress-circular v-if="isLoadingRecommendation" indeterminate size="14" width="2" />
              <span>{{ isLoadingRecommendation ? 'Looking for the closest branch...' : 'No similar branch to merge with.' }}</span>
            </div>

            <template v-else>
              <div class="merge-suggestion__headline">
                <span class="merge-suggestion__node">Node #{{ mergeRecommendation.node_id }}</span>
                <span class="merge-suggestion__score">{{ recommendationScoreLabel }}</span>
              </div>

              <div aria-hidden="true" class="merge-suggestion__meter">
                <span :style="recommendationMeterStyle" />
              </div>

              <p class="merge-suggestion__summary">{{ recommendationPreview }}</p>

              <div v-if="mergeRecommendation.tags && mergeRecommendation.tags.length > 0" class="merge-suggestion__tags">
                <span v-for="tag in mergeRecommendation.tags" :key="tag" class="merge-suggestion__tag">{{ tag }}</span>
              </div>

              <div class="merge-suggestion__actions">
                <v-btn
                  class="merge-suggestion__button"
                  :disabled="isLoadingContext"
                  size="small"
                  variant="text"
                  @click="emit('selectNode', mergeRecommendation.node_id)"
                >
                  View
                </v-btn>
                <v-btn
                  class="merge-suggestion__button merge-suggestion__button--primary"
                  :disabled="isLoadingContext || currentNodeId === null"
                  prepend-icon="mdi-source-merge"
                  size="small"
                  variant="flat"
                  @click="emit('mergeRecommended', mergeRecommendation.node_id)"
                >
                  Merge
                </v-btn>
              </div>
            </template>

            <p v-if="isMergeMode" class="merge-suggestion__hint">
              Or pick any node in the tree to merge with Node #{{ mergeSourceNodeId }}.
            </p>
          </section>
        </Transition>
      </div>
    </Teleport>
  </aside>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, ref } from 'vue'
  import type { FlattenedNode, GraphLane, MergeRecommendation, MessageNode, RootTreeOption } from '@/types/chat'

  const props = withDefaults(defineProps<{
    currentNodeId: number | null
    currentNodeLabel: string
    flattenedTreeNodes: FlattenedNode[]
    isClearingDatabase: boolean
    isLoadingContext: boolean
    isLoadingRecommendation?: boolean
    isLoadingTree: boolean
    isMergeMode?: boolean
    isRecommendationOpen?: boolean
    mergeRecommendation?: MergeRecommendation | null
    mergeSourceNodeId?: number | null
    isCompareMode?: boolean
    compareSourceNodeId?: number | null
    isNewRootDraftActive: boolean
    showFireworkAction?: boolean
    showHeaderActions?: boolean
    showRootSwitcher?: boolean
    showSummary?: boolean
    treeRootOptions: RootTreeOption[]
    treeNodes: MessageNode[]
    treeRoots: number[]
  }>(), {
    showFireworkAction: true,
    showHeaderActions: true,
    showRootSwitcher: true,
    showSummary: true,
    isMergeMode: false,
    isLoadingRecommendation: false,
    isRecommendationOpen: false,
    mergeRecommendation: null,
    mergeSourceNodeId: null,
    isCompareMode: false,
    compareSourceNodeId: null,
  })

  const emit = defineEmits<{
    burstGraph: []
    clearRequested: []
    refreshTree: []
    selectNode: [nodeId: number]
    selectRootTree: [rootId: number]
    startRoot: []
    mergeStart: []
    mergeCancelled: []
    mergeTarget: [nodeId: number]
    compareStart: []
    compareCancelled: []
    compareTarget: [nodeId: number]
    mergeRecommended: [nodeId: number]
    dismissRecommendation: []
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

  // The suggestion starts docked to the bottom right and is then moved around by
  // dragging its header. The offset is kept relative to that resting spot, so the
  // card stays put across open/close cycles.
  const suggestionRef = ref<HTMLElement | null>(null)
  const dragOffset = ref({ x: 0, y: 0 })
  const isDragging = ref(false)
  let dragStart = { pointerX: 0, pointerY: 0, offsetX: 0, offsetY: 0 }

  const suggestionStyle = computed(() => ({
    transform: `translate(${dragOffset.value.x}px, ${dragOffset.value.y}px)`,
  }))

  const clampOffset = (x: number, y: number) => {
    const element = suggestionRef.value
    if (!element) return { x, y }

    const rect = element.getBoundingClientRect()
    const restingLeft = rect.left - dragOffset.value.x
    const restingTop = rect.top - dragOffset.value.y
    const margin = 8

    return {
      x: Math.min(Math.max(x, margin - restingLeft), window.innerWidth - margin - rect.width - restingLeft),
      y: Math.min(Math.max(y, margin - restingTop), window.innerHeight - margin - rect.height - restingTop),
    }
  }

  const onDrag = (event: PointerEvent) => {
    dragOffset.value = clampOffset(
      dragStart.offsetX + event.clientX - dragStart.pointerX,
      dragStart.offsetY + event.clientY - dragStart.pointerY,
    )
  }

  const stopDrag = () => {
    isDragging.value = false
    window.removeEventListener('pointermove', onDrag)
    window.removeEventListener('pointerup', stopDrag)
    window.removeEventListener('pointercancel', stopDrag)
  }

  const startDrag = (event: PointerEvent) => {
    // Let the dismiss button keep its own click.
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return

    event.preventDefault()
    isDragging.value = true
    dragStart = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: dragOffset.value.x,
      offsetY: dragOffset.value.y,
    }

    window.addEventListener('pointermove', onDrag)
    window.addEventListener('pointerup', stopDrag)
    window.addEventListener('pointercancel', stopDrag)
  }

  // A smaller viewport can leave the card parked off-screen. Only meaningful while
  // it is open, since the layer collapses to zero height otherwise.
  const keepSuggestionInView = () => {
    if (!props.isRecommendationOpen) return
    dragOffset.value = clampOffset(dragOffset.value.x, dragOffset.value.y)
  }

  window.addEventListener('resize', keepSuggestionInView)

  onBeforeUnmount(() => {
    stopDrag()
    window.removeEventListener('resize', keepSuggestionInView)
  })

  const recommendationScoreLabel = computed(() => {
    const recommendation = props.mergeRecommendation
    if (!recommendation) return ''
    return `${Math.round(recommendation.similarity * 100)}% match`
  })

  const recommendationMeterStyle = computed(() => {
    const similarity = props.mergeRecommendation?.similarity ?? 0
    return { width: `${Math.min(100, Math.max(4, Math.round(similarity * 100)))}%` }
  })

  const recommendationPreview = computed(() => {
    const recommendation = props.mergeRecommendation
    if (!recommendation) return ''
    if (recommendation.summary) return recommendation.summary
    const item = props.flattenedTreeNodes.find(entry => entry.node.id === recommendation.node_id)
    return item ? nodePreview(item.node) : 'No summary yet'
  })

  const nodeIcon = (node: MessageNode) => {
    if (node.role === 'merge') return 'mdi-source-merge'
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
    'branch-graph__lane--merge-source': item.mergeLanes.includes(lane.index),
    'branch-graph__lane--node': lane.isNode,
    'branch-graph__lane--root': lane.isNode && item.parentLane === null,
    'branch-graph__lane--through': lane.isThrough,
  })

  const mergeLanesForPaint = (item: FlattenedNode) =>
    [...item.mergeLanes].sort((left, right) =>
      Math.abs(right - item.lane) - Math.abs(left - item.lane)
    )

  const mergeLineStyle = (item: FlattenedNode, mergeLane: number) => {
    const firstLane = Math.min(item.lane, mergeLane)
    const lastLane = Math.max(item.lane, mergeLane)
    const sourceLane = item.graphLanes.find(lane => lane.index === mergeLane)

    return {
      background: sourceLane?.color ?? item.branchColor,
      left: `calc((${firstLane} * var(--graph-lane-width)) + (var(--graph-lane-width) / 2))`,
      width: `calc(${lastLane - firstLane} * var(--graph-lane-width))`,
    }
  }

  const graphLaneStyle = (lane: GraphLane) => ({
    '--lane-color': lane.color,
  })
</script>

<style scoped>
  .workspace-panel {
    backdrop-filter: blur(16px);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent 28%),
      var(--surface);
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
    position: relative;
  }

  .panel-header {
    align-items: center;
    display: flex;
    gap: 14px;
    justify-content: space-between;
  }

  .branch-header {
    background: linear-gradient(90deg, rgba(129, 140, 248, 0.08), transparent 50%);
    border-bottom: 1px solid var(--border-soft);
    margin: -2px 0 0;
    padding: 0 0 14px 0;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .branch-header-title {
    min-width: 0;
    flex: 1 1 auto;
  }

  .branch-tools {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-start;
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
    line-height: 1.15;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .icon-action {
    background: var(--icon-button-bg);
    border: 1px solid var(--border-soft);
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
    border-color: var(--border-bright, var(--border));
  }

  .burst-action {
    background: rgba(250, 204, 21, 0.14);
    border-color: rgba(250, 204, 21, 0.32);
    color: #fef3c7;
  }

  .burst-action :deep(.v-btn__content),
  .burst-action :deep(.v-icon) {
    color: #fef3c7;
  }

  .burst-action:hover {
    background: rgba(250, 204, 21, 0.22);
    border-color: rgba(250, 204, 21, 0.52);
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

  /* Teleported to body and fixed, so it floats free of the panel's clipping and can
     be dragged anywhere on screen. */
  .merge-suggestion-layer {
    bottom: 24px;
    pointer-events: none;
    position: fixed;
    right: 24px;
    width: min(320px, calc(100vw - 48px));
    z-index: 1200;
  }

  .merge-suggestion {
    /* Teleported out of .chat-page, so the palette has to travel with the card. */
    --text-strong: #f8fafc;
    --text-muted: #cbd5e1;
    --text-subtle: #94a3b8;
    backdrop-filter: blur(12px);
    background:
      linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(45, 212, 191, 0.12)),
      rgba(15, 23, 42, 0.94);
    border: 1px solid rgba(168, 85, 247, 0.42);
    border-radius: 8px;
    box-shadow: 0 18px 40px rgba(2, 6, 23, 0.55);
    color: var(--text-strong);
    display: grid;
    gap: 8px;
    padding: 12px;
    pointer-events: auto;
  }

  .merge-suggestion--dragging {
    box-shadow: 0 24px 56px rgba(2, 6, 23, 0.68);
    user-select: none;
  }

  .suggestion-pop-enter-active,
  .suggestion-pop-leave-active {
    transition: opacity 0.18s ease, transform 0.18s ease;
  }

  .suggestion-pop-enter-from,
  .suggestion-pop-leave-to {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }

  .merge-suggestion__status {
    align-items: center;
    color: var(--text-muted);
    display: flex;
    font-size: 0.78rem;
    font-weight: 800;
    gap: 8px;
  }

  .merge-suggestion__head {
    align-items: center;
    cursor: grab;
    display: flex;
    justify-content: space-between;
    margin: -12px -12px 0;
    padding: 10px 12px 6px;
    touch-action: none;
  }

  .merge-suggestion--dragging .merge-suggestion__head {
    cursor: grabbing;
  }

  .merge-suggestion__head .eyebrow {
    align-items: center;
    color: #c084fc;
    display: flex;
    gap: 5px;
    margin: 0;
  }

  .merge-suggestion__dismiss {
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--text-subtle);
    cursor: pointer;
    display: grid;
    height: 20px;
    place-items: center;
    width: 20px;
  }

  .merge-suggestion__dismiss:hover {
    background: rgba(148, 163, 184, 0.16);
    color: var(--text-strong);
  }

  .merge-suggestion__headline {
    align-items: baseline;
    display: flex;
    gap: 8px;
    justify-content: space-between;
  }

  .merge-suggestion__node {
    color: var(--text-strong);
    font-size: 0.88rem;
    font-weight: 900;
  }

  .merge-suggestion__score {
    color: #c084fc;
    font-size: 0.78rem;
    font-weight: 900;
  }

  .merge-suggestion__meter {
    background: rgba(148, 163, 184, 0.2);
    border-radius: 999px;
    height: 4px;
    overflow: hidden;
  }

  .merge-suggestion__meter span {
    background: linear-gradient(90deg, #a855f7, #2dd4bf);
    border-radius: 999px;
    display: block;
    height: 100%;
  }

  .merge-suggestion__summary {
    color: var(--text-muted);
    font-size: 0.8rem;
    line-height: 1.3;
    margin: 0;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .merge-suggestion__hint {
    border-top: 1px solid rgba(148, 163, 184, 0.16);
    color: var(--text-subtle);
    font-size: 0.72rem;
    line-height: 1.3;
    margin: 0;
    padding-top: 8px;
  }

  .merge-suggestion__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .merge-suggestion__tag {
    background: rgba(168, 85, 247, 0.16);
    border-radius: 4px;
    color: #c084fc;
    font-size: 0.68rem;
    font-weight: 800;
    padding: 2px 6px;
    text-transform: uppercase;
  }

  .merge-suggestion__actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .merge-suggestion__button {
    color: var(--text-strong);
    font-weight: 800;
    letter-spacing: 0;
    text-transform: none;
  }

  .merge-suggestion__button--primary {
    background: rgba(168, 85, 247, 0.28);
    border: 1px solid rgba(168, 85, 247, 0.44);
  }

  .merge-suggestion__button--primary:hover {
    background: rgba(168, 85, 247, 0.4);
  }

  .branch-tree {
    align-content: start;
    background:
      linear-gradient(90deg, rgba(148, 163, 184, 0.04) 1px, transparent 1px),
      transparent;
    background-size: 18px 100%;
    border-radius: 8px;
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

  .merge-banner {
    background: rgba(20, 184, 166, 0.16);
    border: 1px solid rgba(20, 184, 166, 0.3);
    border-radius: 8px;
    color: var(--primary, #14b8a6);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    margin-bottom: 12px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .compare-banner {
    background: rgba(168, 85, 247, 0.16);
    border: 1px solid rgba(168, 85, 247, 0.3);
    color: #c084fc;
  }

  .cancel-merge-btn {
    color: var(--text-strong, #f8fafc);
    text-transform: none;
    font-weight: 800;
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
    --graph-line: rgba(148, 163, 184, 0.36);
    --node-active-bg: rgba(20, 184, 166, 0.16);
    --node-active-ring: rgba(20, 184, 166, 0.28);
    --node-accent: var(--primary);
    align-items: center;
    background: rgba(15, 23, 42, 0.18);
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
    position: relative;
    text-align: left;
    transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
    width: 100%;
  }

  .branch-node::after {
    background: var(--node-accent);
    border-radius: 999px;
    bottom: 9px;
    content: "";
    opacity: 0;
    position: absolute;
    right: 5px;
    top: 9px;
    transition: opacity 0.16s ease;
    width: 3px;
  }

  .branch-node:disabled {
    cursor: progress;
  }

  .branch-node:hover:not(:disabled),
  .branch-node--active {
    background:
      linear-gradient(90deg, var(--node-active-bg), rgba(15, 23, 42, 0.16));
    border-color: var(--node-accent);
  }

  .branch-node:hover:not(:disabled) {
    transform: translateX(2px);
  }

  .branch-node--active::after {
    opacity: 1;
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

  .branch-node--active .branch-node__meta {
    color: var(--text-muted);
  }

  .branch-node__preview {
    color: var(--text-muted);
    font-size: 0.82rem;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .branch-node--active .branch-node__preview {
    color: var(--text-strong);
  }

  :global(.branch-tooltip-content) {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px;
    max-width: 260px;
  }
  
  :global(.branch-tooltip-summary) {
    font-size: 0.85rem;
    line-height: 1.3;
    font-weight: 500;
  }

  :global(.branch-tooltip-tags) {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  :global(.branch-tooltip-tag) {
    background: rgba(45, 212, 191, 0.15);
    color: #2dd4bf;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .branch-node__children {
    color: var(--text-subtle);
  }

  .branch-node__fork {
    background: var(--node-accent);
    border-radius: 999px;
    box-shadow: 0 0 14px color-mix(in srgb, var(--node-accent) 48%, transparent);
    height: 3px;
    opacity: 0.82;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 0;
  }

  .branch-node:hover:not(:disabled) .branch-node__fork,
  .branch-node--active .branch-node__fork {
    opacity: 1;
  }

  .branch-node__merge-line {
    background: var(--node-accent);
    border-radius: 999px;
    box-shadow: 0 0 14px color-mix(in srgb, var(--node-accent) 48%, transparent);
    height: 3px;
    opacity: 0.82;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 0;
  }

  .branch-node:hover:not(:disabled) .branch-node__merge-line,
  .branch-node--active .branch-node__merge-line {
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
    width: 3px;
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

  .branch-graph__lane--merge-source::before {
    background: var(--lane-color) !important;
    bottom: 50% !important;
    display: block !important;
    opacity: 0.82 !important;
    top: 0 !important;
  }

  .branch-graph__dot {
    background: var(--surface);
    border: 3px solid var(--node-accent);
    border-radius: 999px;
    box-shadow: 0 0 0 3px var(--surface);
    height: 14px;
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 14px;
    z-index: 2;
  }

  .branch-node:hover:not(:disabled) .branch-graph__dot,
  .branch-node--active .branch-graph__dot {
    background: var(--node-accent);
    box-shadow:
      0 0 0 3px var(--surface),
      0 0 0 7px var(--node-active-ring),
      0 0 24px color-mix(in srgb, var(--node-accent) 46%, transparent);
  }

  .branch-node--active .branch-graph__dot {
    animation: active-node-pulse 2.2s ease-in-out infinite;
  }

  @keyframes active-node-pulse {
    0%,
    100% {
      box-shadow:
        0 0 0 3px var(--surface),
        0 0 0 7px var(--node-active-ring),
        0 0 18px color-mix(in srgb, var(--node-accent) 36%, transparent);
    }

    50% {
      box-shadow:
        0 0 0 3px var(--surface),
        0 0 0 9px var(--node-active-ring),
        0 0 34px color-mix(in srgb, var(--node-accent) 58%, transparent);
    }
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

  @media (prefers-reduced-motion: reduce) {
    .branch-node--active .branch-graph__dot {
      animation: none;
    }

    .suggestion-pop-enter-active,
    .suggestion-pop-leave-active {
      transition: none;
    }
  }
</style>

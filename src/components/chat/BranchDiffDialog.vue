<template>
  <v-dialog
    :model-value="modelValue"
    max-width="960"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <section class="diff-dialog">
      <header class="diff-header">
        <div class="diff-header__title">
          <v-icon color="cyan-lighten-2" icon="mdi-compare" size="24" />
          <div>
            <h2>Branch Comparison</h2>
            <p v-if="diffData" class="diff-header__subtitle">
              Node #{{ diffData.node_a_id }} vs Node #{{ diffData.node_b_id }}
            </p>
          </div>
        </div>

        <div class="diff-header__meta">
          <v-chip
            v-if="diffData && diffData.similarity !== null"
            class="similarity-chip"
            color="teal"
            prepend-icon="mdi-chart-bell-curve"
            size="small"
            variant="tonal"
          >
            {{ Math.round(diffData.similarity * 100) }}% Similarity
          </v-chip>
          <v-btn
            aria-label="Close dialog"
            icon="mdi-close"
            size="small"
            variant="text"
            @click="emit('update:modelValue', false)"
          />
        </div>
      </header>

      <div v-if="isLoading" class="diff-loading">
        <v-progress-circular indeterminate size="40" width="3" />
        <span>Calculating branch divergence...</span>
      </div>

      <div v-else-if="diffData" class="diff-body">
        <!-- LCA / Common Ancestor Banner -->
        <div class="diff-lca-banner">
          <v-icon color="indigo-lighten-2" icon="mdi-source-fork" size="18" />
          <div v-if="diffData.lca_node" class="diff-lca-content">
            <span class="diff-lca-label">Lowest Common Ancestor:</span>
            <button
              class="diff-node-link"
              type="button"
              @click="emit('selectNode', diffData.lca_node.id)"
            >
              Node #{{ diffData.lca_node.id }}
            </button>
            <span class="diff-lca-preview">{{ nodePreview(diffData.lca_node) }}</span>
          </div>
          <div v-else class="diff-lca-content">
            <span class="diff-lca-label">Independent Roots:</span>
            <span>These branches have distinct root ancestors and diverged from the start.</span>
          </div>
        </div>

        <!-- Columns Comparison -->
        <div class="diff-columns">
          <!-- Column A -->
          <article class="diff-column">
            <div class="diff-column__header diff-column__header--a">
              <span class="diff-column__tag">Branch A</span>
              <button
                class="diff-node-link"
                type="button"
                @click="emit('selectNode', diffData.node_a_id)"
              >
                Node #{{ diffData.node_a_id }}
              </button>
            </div>

            <div v-if="diffData.summary_a" class="diff-summary-card">
              <p class="diff-summary-text">{{ diffData.summary_a }}</p>
              <div v-if="diffData.tags_a && diffData.tags_a.length > 0" class="diff-tags">
                <span v-for="tag in diffData.tags_a" :key="tag" class="diff-tag">{{ tag }}</span>
              </div>
            </div>

            <div class="diff-message-list">
              <p class="diff-section-label">
                Divergent Messages ({{ diffData.branch_a_nodes.length }})
              </p>

              <p v-if="diffData.branch_a_nodes.length === 0" class="diff-empty-notice">
                No unique messages on this branch since divergence.
              </p>

              <div
                v-for="node in diffData.branch_a_nodes"
                :key="node.id"
                class="diff-node-item"
              >
                <header class="diff-node-item__head">
                  <v-icon :icon="nodeIcon(node)" size="14" />
                  <span>{{ node.role }}</span>
                  <small>#{{ node.id }}</small>
                </header>
                <div v-if="node.user_content" class="diff-bubble diff-bubble--user">
                  <strong>User:</strong>
                  <p>{{ node.user_content }}</p>
                </div>
                <div v-if="node.assistant_content" class="diff-bubble diff-bubble--assistant">
                  <strong>Assistant:</strong>
                  <p>{{ node.assistant_content }}</p>
                </div>
                <div v-if="!node.user_content && !node.assistant_content" class="diff-bubble">
                  <p>{{ node.content }}</p>
                </div>
              </div>
            </div>
          </article>

          <!-- Column B -->
          <article class="diff-column">
            <div class="diff-column__header diff-column__header--b">
              <span class="diff-column__tag">Branch B</span>
              <button
                class="diff-node-link"
                type="button"
                @click="emit('selectNode', diffData.node_b_id)"
              >
                Node #{{ diffData.node_b_id }}
              </button>
            </div>

            <div v-if="diffData.summary_b" class="diff-summary-card">
              <p class="diff-summary-text">{{ diffData.summary_b }}</p>
              <div v-if="diffData.tags_b && diffData.tags_b.length > 0" class="diff-tags">
                <span v-for="tag in diffData.tags_b" :key="tag" class="diff-tag">{{ tag }}</span>
              </div>
            </div>

            <div class="diff-message-list">
              <p class="diff-section-label">
                Divergent Messages ({{ diffData.branch_b_nodes.length }})
              </p>

              <p v-if="diffData.branch_b_nodes.length === 0" class="diff-empty-notice">
                No unique messages on this branch since divergence.
              </p>

              <div
                v-for="node in diffData.branch_b_nodes"
                :key="node.id"
                class="diff-node-item"
              >
                <header class="diff-node-item__head">
                  <v-icon :icon="nodeIcon(node)" size="14" />
                  <span>{{ node.role }}</span>
                  <small>#{{ node.id }}</small>
                </header>
                <div v-if="node.user_content" class="diff-bubble diff-bubble--user">
                  <strong>User:</strong>
                  <p>{{ node.user_content }}</p>
                </div>
                <div v-if="node.assistant_content" class="diff-bubble diff-bubble--assistant">
                  <strong>Assistant:</strong>
                  <p>{{ node.assistant_content }}</p>
                </div>
                <div v-if="!node.user_content && !node.assistant_content" class="diff-bubble">
                  <p>{{ node.content }}</p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      <footer class="diff-footer">
        <v-btn
          class="dialog-button"
          variant="text"
          @click="emit('update:modelValue', false)"
        >
          Close
        </v-btn>

        <v-btn
          v-if="diffData"
          class="dialog-button merge-button"
          prepend-icon="mdi-source-merge"
          variant="flat"
          @click="emit('merge', diffData.node_a_id, diffData.node_b_id)"
        >
          Merge these branches
        </v-btn>
      </footer>
    </section>
  </v-dialog>
</template>

<script setup lang="ts">
  import type { BranchDiffPayload, MessageNode } from '@/types/chat'

  defineProps<{
    diffData: BranchDiffPayload | null
    isLoading: boolean
    modelValue: boolean
  }>()

  const emit = defineEmits<{
    merge: [nodeAId: number, nodeBId: number]
    selectNode: [nodeId: number]
    'update:modelValue': [value: boolean]
  }>()

  const nodePreview = (node: MessageNode) => {
    const text = node.user_content || node.assistant_content || node.content || ''
    const normalized = text.replace(/\s+/g, ' ').trim()
    return normalized.length > 50 ? `${normalized.slice(0, 50)}...` : normalized
  }

  const nodeIcon = (node: MessageNode) => {
    if (node.role === 'merge') return 'mdi-source-merge'
    if (node.role === 'exchange') return 'mdi-swap-horizontal'
    return node.role === 'user' ? 'mdi-account' : 'mdi-robot'
  }
</script>

<style scoped>
  .diff-dialog {
    background: var(--surface, #0f172a);
    border: 1px solid var(--border, rgba(148, 163, 184, 0.24));
    border-radius: 8px;
    box-shadow: var(--shadow, 0 18px 48px rgba(0, 0, 0, 0.36));
    color: var(--text-strong, #f8fafc);
    display: grid;
    grid-template-rows: auto 1fr auto;
    max-height: 85vh;
    min-height: 480px;
    overflow: hidden;
  }

  .diff-header {
    align-items: center;
    border-bottom: 1px solid var(--border-soft, rgba(148, 163, 184, 0.14));
    display: flex;
    justify-content: space-between;
    padding: 16px 20px;
  }

  .diff-header__title {
    align-items: center;
    display: flex;
    gap: 12px;
  }

  .diff-header__title h2 {
    font-size: 1.15rem;
    font-weight: 800;
    line-height: 1.2;
    margin: 0;
  }

  .diff-header__subtitle {
    color: var(--text-muted, #cbd5e1);
    font-size: 0.78rem;
    font-weight: 700;
    margin: 2px 0 0;
  }

  .diff-header__meta {
    align-items: center;
    display: flex;
    gap: 10px;
  }

  .similarity-chip {
    font-weight: 800;
  }

  .diff-loading {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 12px;
    justify-content: center;
    min-height: 240px;
    color: var(--text-muted, #cbd5e1);
  }

  .diff-body {
    display: grid;
    gap: 14px;
    grid-template-rows: auto 1fr;
    min-height: 0;
    overflow: hidden;
    padding: 16px 20px;
  }

  .diff-lca-banner {
    align-items: center;
    background: rgba(99, 102, 241, 0.12);
    border: 1px solid rgba(99, 102, 241, 0.28);
    border-radius: 6px;
    display: flex;
    font-size: 0.82rem;
    gap: 10px;
    padding: 10px 14px;
  }

  .diff-lca-content {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .diff-lca-label {
    color: var(--text-muted, #cbd5e1);
    font-weight: 800;
    text-transform: uppercase;
    font-size: 0.72rem;
  }

  .diff-node-link {
    background: rgba(45, 212, 191, 0.16);
    border: 1px solid rgba(45, 212, 191, 0.36);
    border-radius: 4px;
    color: #5eead4;
    cursor: pointer;
    font-weight: 800;
    padding: 2px 8px;
    text-decoration: none;
  }

  .diff-node-link:hover {
    background: rgba(45, 212, 191, 0.28);
  }

  .diff-lca-preview {
    color: var(--text-subtle, #94a3b8);
    font-style: italic;
  }

  .diff-columns {
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr 1fr;
    min-height: 0;
    overflow: hidden;
  }

  .diff-column {
    background: rgba(2, 6, 23, 0.28);
    border: 1px solid var(--border-soft, rgba(148, 163, 184, 0.14));
    border-radius: 6px;
    display: grid;
    grid-template-rows: auto auto 1fr;
    min-height: 0;
    overflow: hidden;
  }

  .diff-column__header {
    align-items: center;
    border-bottom: 1px solid var(--border-soft, rgba(148, 163, 184, 0.14));
    display: flex;
    gap: 8px;
    padding: 10px 14px;
  }

  .diff-column__header--a {
    background: rgba(20, 184, 166, 0.08);
  }

  .diff-column__header--b {
    background: rgba(249, 115, 22, 0.08);
  }

  .diff-column__tag {
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .diff-summary-card {
    background: rgba(15, 23, 42, 0.5);
    border-bottom: 1px solid var(--border-soft, rgba(148, 163, 184, 0.14));
    padding: 10px 14px;
  }

  .diff-summary-text {
    font-size: 0.84rem;
    font-weight: 600;
    line-height: 1.4;
    margin: 0 0 6px;
  }

  .diff-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .diff-tag {
    background: rgba(148, 163, 184, 0.16);
    border-radius: 4px;
    color: #cbd5e1;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 2px 6px;
  }

  .diff-message-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    overflow-y: auto;
    padding: 14px;
  }

  .diff-section-label {
    color: var(--text-muted, #cbd5e1);
    font-size: 0.7rem;
    font-weight: 800;
    margin: 0;
    text-transform: uppercase;
  }

  .diff-empty-notice {
    color: var(--text-subtle, #94a3b8);
    font-size: 0.82rem;
    font-style: italic;
    margin: 12px 0;
    text-align: center;
  }

  .diff-node-item {
    background: rgba(15, 23, 42, 0.65);
    border: 1px solid var(--border-soft, rgba(148, 163, 184, 0.18));
    border-radius: 6px;
    display: grid;
    gap: 6px;
    padding: 10px;
  }

  .diff-node-item__head {
    align-items: center;
    color: var(--text-subtle, #94a3b8);
    display: flex;
    font-size: 0.7rem;
    font-weight: 800;
    gap: 6px;
    text-transform: uppercase;
  }

  .diff-bubble {
    border-radius: 4px;
    font-size: 0.82rem;
    line-height: 1.45;
    padding: 8px 10px;
  }

  .diff-bubble p {
    margin: 4px 0 0;
    white-space: pre-wrap;
  }

  .diff-bubble--user {
    background: rgba(45, 212, 191, 0.1);
    border-left: 2px solid #2dd4bf;
  }

  .diff-bubble--assistant {
    background: rgba(129, 140, 248, 0.1);
    border-left: 2px solid #818cf8;
  }

  .diff-footer {
    align-items: center;
    border-top: 1px solid var(--border-soft, rgba(148, 163, 184, 0.14));
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding: 14px 20px;
  }

  .dialog-button {
    border-radius: 6px;
    font-weight: 800;
    text-transform: none;
  }

  .merge-button {
    background: var(--button-primary-bg, #2dd4bf);
    color: var(--button-primary-text, #042f2e);
  }

  .merge-button:hover {
    background: var(--button-primary-hover, #5eead4);
  }

  @media (max-width: 768px) {
    .diff-columns {
      grid-template-columns: 1fr;
    }
  }
</style>

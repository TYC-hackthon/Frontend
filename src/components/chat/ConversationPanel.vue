<template>
  <main class="workspace-panel conversation-panel">
    <header class="conversation-header">
      <div class="conversation-title">
        <p class="eyebrow">Active model</p>
        <h2>{{ activeModelLabel }}</h2>
      </div>

      <div class="conversation-status">
        <v-chip
          class="compact-chip"
          color="indigo"
          prepend-icon="mdi-vector-polyline"
          variant="tonal"
        >
          {{ contextSummary }}
        </v-chip>

        <v-chip
          class="compact-chip"
          color="blue-grey"
          prepend-icon="mdi-graph-outline"
          variant="tonal"
        >
          {{ nodeCount }} nodes
        </v-chip>
      </div>
    </header>

    <div ref="messageListRef" class="message-list">
      <div v-if="isLoadingContext" class="message-row message-row--assistant">
        <article class="message-bubble">
          <span>Context</span>
          <v-progress-linear indeterminate rounded />
        </article>
      </div>

      <p v-else-if="messages.length === 0" class="empty-context">
        No active context
      </p>

      <div
        v-for="message in messages"
        :key="message.id"
        class="message-row"
        :class="`message-row--${message.role}`"
      >
        <article class="message-bubble">
          <span>
            {{ message.role === 'user' ? 'You' : 'Assistant' }}
            <small v-if="message.nodeId">#{{ message.nodeId }}</small>
          </span>
          <MessageRenderer :content="message.content" />
        </article>
      </div>

      <div v-if="isSending" class="message-row message-row--assistant">
        <article class="message-bubble">
          <span>Assistant</span>
          <v-progress-linear indeterminate rounded />
        </article>
      </div>
    </div>

    <v-alert
      v-if="errorMessage"
      class="error-alert"
      closable
      density="compact"
      type="error"
      variant="tonal"
      @click:close="emit('dismissError')"
    >
      {{ errorMessage }}
    </v-alert>

    <form class="composer" @submit.prevent="emit('send')">
      <v-textarea
        v-model="draft"
        auto-grow
        class="composer-input"
        density="comfortable"
        hide-details
        label="Message"
        max-rows="6"
        rows="2"
        variant="outlined"
        @keydown.enter.exact.prevent="emit('send')"
      />

      <v-tooltip text="Send" location="top">
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="tooltipProps"
            aria-label="Send"
            class="send-button primary-action"
            :disabled="!canSend"
            icon="mdi-send"
            :loading="isSending"
            type="submit"
            variant="flat"
          />
        </template>
      </v-tooltip>
    </form>
  </main>
</template>

<script setup lang="ts">
  import { nextTick, ref } from 'vue'
  import MessageRenderer from '@/components/chat/MessageRenderer.vue'
  import type { ChatMessage } from '@/types/chat'

  defineProps<{
    activeModelLabel: string
    canSend: boolean
    contextSummary: string
    errorMessage: string
    isLoadingContext: boolean
    isSending: boolean
    messages: ChatMessage[]
    nodeCount: number
  }>()

  const emit = defineEmits<{
    dismissError: []
    send: []
  }>()

  const draft = defineModel<string>('draft', { required: true })
  const messageListRef = ref<HTMLElement | null>(null)

  const scrollToBottom = async () => {
    await nextTick()
    if (!messageListRef.value) return
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }

  defineExpose({
    scrollToBottom,
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

  .conversation-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto auto;
    min-height: 0;
    overflow: hidden;
  }

  .conversation-header {
    align-items: center;
    border-bottom: 1px solid var(--border-soft);
    display: flex;
    gap: 14px;
    justify-content: space-between;
    padding: 18px 20px;
  }

  .conversation-title {
    min-width: 0;
  }

  .conversation-title h2 {
    color: var(--text-strong);
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1.15;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .conversation-status {
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

  .compact-chip {
    background: var(--chip-bg);
    color: var(--chip-text);
    flex: 0 0 auto;
    font-weight: 700;
  }

  .message-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
    max-height: 100%;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 22px;
  }

  .message-row {
    display: flex;
  }

  .message-row--user {
    justify-content: flex-end;
  }

  .message-row--assistant {
    justify-content: flex-start;
  }

  .message-bubble {
    border-radius: 8px;
    max-width: min(760px, 86%);
    padding: 14px 16px;
  }

  .message-row--user .message-bubble {
    background: var(--user-bubble-bg);
    color: var(--user-bubble-text);
  }

  .message-row--assistant .message-bubble {
    background: var(--assistant-bubble-bg);
    color: var(--assistant-bubble-text);
  }

  .message-bubble span {
    align-items: center;
    display: flex;
    font-size: 0.72rem;
    font-weight: 900;
    gap: 6px;
    margin-bottom: 6px;
    opacity: 0.8;
    text-transform: uppercase;
  }

  .message-bubble small {
    font-size: 0.7rem;
    font-weight: 900;
  }

  .empty-context {
    align-self: center;
    color: var(--text-subtle);
    font-weight: 800;
    justify-self: center;
    margin: 0;
    padding: 24px;
    text-align: center;
  }

  .error-alert {
    margin: 0 20px 14px;
  }

  .composer {
    align-items: end;
    border-top: 1px solid var(--border-soft);
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) 48px;
    padding: 14px 20px 18px;
  }

  .composer-input {
    min-width: 0;
  }

  .send-button {
    border-radius: 8px;
    box-shadow: none;
    font-weight: 800;
    height: 48px;
    letter-spacing: 0;
    min-width: 48px;
    text-transform: none;
    width: 48px;
  }

  .primary-action {
    background: var(--button-primary-bg);
    color: var(--button-primary-text);
  }

  .primary-action :deep(.v-btn__content),
  .primary-action :deep(.v-icon) {
    color: var(--button-primary-text);
  }

  .primary-action:hover {
    background: var(--button-primary-hover);
  }

  @media (max-width: 820px) {
    .conversation-panel {
      min-height: 0;
      overflow: hidden;
    }

    .conversation-header {
      align-items: flex-start;
      flex-direction: column;
      padding: 16px;
    }

    .conversation-status {
      flex-wrap: wrap;
    }

    .message-list {
      padding: 16px;
    }

    .message-bubble {
      max-width: 94%;
    }

    .composer {
      grid-template-columns: 1fr 48px;
      padding: 12px 16px 16px;
    }
  }
</style>

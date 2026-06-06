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

      <section v-else-if="messages.length === 0" class="empty-context">
        <span class="empty-context__icon">
          <v-icon icon="mdi-vector-polyline-plus" size="28" />
        </span>
        <span class="empty-context__title">No active context</span>
        <span class="empty-context__copy">Start from this root or select a branch node.</span>
      </section>

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
          <p>{{ message.content }}</p>
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
  import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
  import type { ChatMessage } from '@/types/chat'

  const props = defineProps<{
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
  const scrollCorrectionTimers: number[] = []

  const scrollOnNextFrame = () =>
    new Promise<void>(resolve => {
      window.requestAnimationFrame(() => resolve())
    })

  const pinMessageListToBottom = () => {
    if (!messageListRef.value) return
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }

  const scrollToBottom = async () => {
    await nextTick()
    pinMessageListToBottom()
    await scrollOnNextFrame()
    pinMessageListToBottom()
    await scrollOnNextFrame()
    pinMessageListToBottom()

    scrollCorrectionTimers.splice(0).forEach(timerId => window.clearTimeout(timerId))
    scrollCorrectionTimers.push(
      window.setTimeout(pinMessageListToBottom, 80),
      window.setTimeout(pinMessageListToBottom, 220),
    )
  }

  watch(
    () => [props.messages.length, props.isSending, props.isLoadingContext],
    () => {
      scrollToBottom()
    },
    { flush: 'post' },
  )

  onBeforeUnmount(() => {
    scrollCorrectionTimers.splice(0).forEach(timerId => window.clearTimeout(timerId))
  })

  defineExpose({
    scrollToBottom,
  })
</script>

<style scoped>
  .workspace-panel {
    backdrop-filter: blur(16px);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent 26%),
      var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: var(--shadow);
    color: var(--text-strong);
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    position: relative;
  }

  .workspace-panel::before {
    background: linear-gradient(120deg, transparent 8%, rgba(45, 212, 191, 0.56), rgba(129, 140, 248, 0.28), transparent 52%);
    content: "";
    height: 2px;
    left: -38%;
    opacity: 0.72;
    position: absolute;
    right: -38%;
    top: 0;
    transform: translateX(-22%);
    z-index: 2;
    animation: panel-light-sweep 4.6s ease-in-out infinite;
  }

  .conversation-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto auto;
    min-height: 0;
    overflow: hidden;
  }

  .conversation-header {
    align-items: center;
    background:
      linear-gradient(90deg, rgba(20, 184, 166, 0.08), transparent 38%),
      rgba(2, 6, 23, 0.18);
    border-bottom: 1px solid var(--border-soft);
    display: flex;
    gap: 14px;
    justify-content: space-between;
    min-height: 56px;
    padding: 10px 16px;
  }

  .conversation-title {
    min-width: 0;
  }

  .conversation-title h2 {
    color: var(--text-strong);
    font-size: 0.96rem;
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
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    margin: 0 0 2px;
    text-transform: uppercase;
  }

  .compact-chip {
    background: var(--chip-bg);
    border: 1px solid var(--border-soft);
    color: var(--chip-text);
    flex: 0 0 auto;
    font-weight: 700;
    height: 28px;
  }

  .message-list {
    background:
      linear-gradient(rgba(148, 163, 184, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148, 163, 184, 0.026) 1px, transparent 1px),
      var(--surface-sunken, rgba(2, 6, 23, 0.24));
    background-size: 32px 32px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
    max-height: 100%;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 24px;
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
    border: 1px solid transparent;
    border-radius: 8px;
    box-shadow: var(--shadow-soft, 0 14px 36px rgba(0, 0, 0, 0.28));
    max-width: min(760px, 86%);
    padding: 14px 16px;
    position: relative;
  }

  .message-row--user .message-bubble {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent),
      var(--user-bubble-bg);
    border-color: rgba(94, 234, 212, 0.24);
    color: var(--user-bubble-text);
  }

  .message-row--assistant .message-bubble {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent),
      var(--assistant-bubble-bg);
    border-color: rgba(129, 140, 248, 0.24);
    color: var(--assistant-bubble-text);
  }

  .message-bubble::before {
    border-radius: 999px;
    bottom: 12px;
    content: "";
    position: absolute;
    top: 12px;
    width: 3px;
  }

  .message-row--user .message-bubble::before {
    background: rgba(94, 234, 212, 0.74);
    right: -1px;
  }

  .message-row--assistant .message-bubble::before {
    background: rgba(129, 140, 248, 0.78);
    left: -1px;
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

  .message-bubble p {
    line-height: 1.62;
    margin: 0;
    white-space: pre-wrap;
  }

  .empty-context {
    align-self: center;
    background: rgba(15, 23, 42, 0.62);
    border: 1px solid var(--border-soft);
    border-radius: 8px;
    box-shadow: var(--shadow-soft, 0 14px 36px rgba(0, 0, 0, 0.28));
    color: var(--text-subtle);
    display: grid;
    gap: 8px;
    justify-items: center;
    margin: 0 auto;
    max-width: 320px;
    padding: 28px 30px;
    text-align: center;
  }

  .empty-context__icon {
    align-items: center;
    background: rgba(45, 212, 191, 0.12);
    border: 1px solid rgba(45, 212, 191, 0.26);
    border-radius: 8px;
    color: var(--button-secondary-text);
    display: inline-flex;
    height: 48px;
    justify-content: center;
    width: 48px;
  }

  .empty-context__title {
    color: var(--text-strong);
    font-weight: 900;
  }

  .empty-context__copy {
    font-size: 0.86rem;
    line-height: 1.4;
  }

  .error-alert {
    margin: 0 20px 14px;
  }

  .composer {
    align-items: end;
    background:
      linear-gradient(180deg, rgba(15, 23, 42, 0.2), rgba(2, 6, 23, 0.24)),
      var(--surface);
    border-top: 1px solid var(--border-soft);
    display: grid;
    gap: 10px;
    grid-template-columns: minmax(0, 1fr) 40px;
    padding: 8px 16px 10px;
  }

  .composer-input {
    min-width: 0;
  }

  .composer-input :deep(.v-field__input) {
    min-height: 40px;
    padding-bottom: 6px;
    padding-top: 6px;
  }

  .composer-input :deep(textarea) {
    line-height: 1.35;
  }

  .send-button {
    animation: send-glow 3.2s ease-in-out infinite;
    border-radius: 8px;
    box-shadow: 0 12px 26px rgba(45, 212, 191, 0.16);
    font-weight: 800;
    height: 40px;
    letter-spacing: 0;
    min-width: 40px;
    text-transform: none;
    width: 40px;
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
    box-shadow: 0 16px 32px rgba(45, 212, 191, 0.22);
  }

  @keyframes send-glow {
    0%,
    100% {
      box-shadow: 0 12px 26px rgba(45, 212, 191, 0.16);
    }

    50% {
      box-shadow: 0 0 30px rgba(45, 212, 191, 0.3);
    }
  }

  @keyframes panel-light-sweep {
    0%,
    100% {
      transform: translateX(-30%);
    }

    50% {
      transform: translateX(30%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .workspace-panel::before,
    .send-button {
      animation: none;
    }
  }

  @media (max-width: 820px) {
    .conversation-panel {
      min-height: 0;
      overflow: hidden;
    }

    .conversation-header {
      align-items: flex-start;
      flex-direction: column;
      gap: 8px;
      padding: 10px 12px;
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
      grid-template-columns: 1fr 40px;
      padding: 8px 12px 10px;
    }
  }
</style>

<template>
  <v-container class="chat-page" fluid>
    <section class="chat-shell">
      <aside class="settings-panel">
        <div>
          <p class="eyebrow">Git-like AI Chat</p>
          <h1>Conversation workspace</h1>
        </div>

        <v-select
          v-model="selectedProvider"
          density="comfortable"
          hide-details
          item-title="label"
          item-value="provider"
          label="Provider"
          :items="providers"
          variant="outlined"
        />

        <v-combobox
          v-model="selectedModel"
          density="comfortable"
          hide-details
          label="Model"
          :items="modelOptions"
          variant="outlined"
        />

        <div v-if="selectedProvider === 'ollama'" class="ollama-settings">
          <v-text-field
            v-model="ollamaBaseUrl"
            density="comfortable"
            hide-details
            label="Ollama Base URL"
            placeholder="http://localhost:11434"
            prepend-inner-icon="mdi-link-variant"
            variant="outlined"
            @blur="detectOllamaModels(true)"
          />

          <v-btn
            color="primary"
            :loading="isDetectingModels"
            prepend-icon="mdi-magnify"
            variant="tonal"
            @click="detectOllamaModels(false)"
          >
            Detect models
          </v-btn>
        </div>

        <v-textarea
          v-model="systemPrompt"
          auto-grow
          density="comfortable"
          hide-details
          label="System prompt"
          rows="4"
          variant="outlined"
        />

        <v-alert
          v-if="providerHint"
          class="provider-hint"
          density="compact"
          type="info"
          variant="tonal"
        >
          {{ providerHint }}
        </v-alert>

        <v-btn
          block
          color="primary"
          prepend-icon="mdi-refresh"
          variant="tonal"
          @click="resetConversation"
        >
          New conversation
        </v-btn>
      </aside>

      <main class="conversation-panel">
        <header class="conversation-header">
          <div>
            <p class="eyebrow">Active model</p>
            <h2>{{ activeModelLabel }}</h2>
          </div>

          <v-chip
            class="status-chip"
            :color="isReady ? 'teal' : 'deep-orange'"
            prepend-icon="mdi-circle-medium"
            variant="tonal"
          >
            {{ isReady ? 'Ready' : 'Needs setup' }}
          </v-chip>
        </header>

        <div ref="messageListRef" class="message-list">
          <div
            v-for="message in messages"
            :key="message.id"
            class="message-row"
            :class="`message-row--${message.role}`"
          >
            <article class="message-bubble">
              <span>{{ message.role === 'user' ? 'You' : 'Assistant' }}</span>
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
          @click:close="errorMessage = ''"
        >
          {{ errorMessage }}
        </v-alert>

        <form class="composer" @submit.prevent="sendMessage">
          <v-textarea
            v-model="draft"
            auto-grow
            density="comfortable"
            hide-details
            label="Message"
            max-rows="6"
            rows="2"
            variant="outlined"
            @keydown.enter.exact.prevent="sendMessage"
          />

          <v-btn
            class="send-button"
            color="primary"
            :disabled="!canSend"
            :loading="isSending"
            type="submit"
          >
            <v-icon icon="mdi-send" />
          </v-btn>
        </form>
      </main>
    </section>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, nextTick, onMounted, ref, watch } from 'vue'

  type Provider = {
    provider: string
    label: string
    models: string[]
    configured: boolean
    hint: string
  }

  type ChatMessage = {
    id: number
    role: 'user' | 'assistant'
    content: string
  }

  const fallbackProviders: Provider[] = [
    {
      provider: 'ollama',
      label: 'Ollama',
      models: ['llama3.1', 'llama3', 'mistral', 'gemma2'],
      configured: true,
      hint: 'Start Ollama locally before sending a message.',
    },
    {
      provider: 'gemini',
      label: 'Gemini',
      models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
      configured: false,
      hint: 'Set GEMINI_API_KEY on the backend before using Gemini.',
    },
  ]

  const providers = ref<Provider[]>(fallbackProviders)
  const selectedProvider = ref('ollama')
  const selectedModel = ref('llama3.1')
  const ollamaBaseUrl = ref('http://localhost:11434')
  const ollamaModels = ref<string[]>([])
  const systemPrompt = ref('You are a concise assistant that keeps context clean and explicit.')
  const draft = ref('')
  const messages = ref<ChatMessage[]>([])
  const isSending = ref(false)
  const isDetectingModels = ref(false)
  const errorMessage = ref('')
  const messageListRef = ref<HTMLElement | null>(null)
  let nextMessageId = 1

  const activeProvider = computed(() =>
    providers.value.find(provider => provider.provider === selectedProvider.value) ?? providers.value[0]
  )

  const availableModels = computed(() => activeProvider.value?.models ?? [])

  const modelOptions = computed(() => {
    const detectedModels = selectedProvider.value === 'ollama' ? ollamaModels.value : []
    return [...new Set([...detectedModels, ...availableModels.value])]
  })

  const providerHint = computed(() => activeProvider.value?.hint ?? '')

  const activeModelLabel = computed(() => {
    if (!activeProvider.value || !selectedModel.value) return 'No model selected'
    return `${activeProvider.value.label} / ${selectedModel.value}`
  })

  const isReady = computed(() => Boolean(activeProvider.value?.configured))

  const canSend = computed(() =>
    draft.value.trim().length > 0 &&
    selectedProvider.value.length > 0 &&
    selectedModel.value.trim().length > 0 &&
    !isSending.value
  )

  const scrollToBottom = async () => {
    await nextTick()
    if (!messageListRef.value) return
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }

  const loadModels = async () => {
    try {
      const response = await fetch('/api/models')
      const payload = await response.json()
      if (!payload.ok) throw new Error(payload.error ?? 'Unable to load models.')
      providers.value = payload.data
    } catch {
      providers.value = fallbackProviders
      errorMessage.value = 'Using local model defaults because the backend is not reachable.'
    }
  }

  const detectOllamaModels = async (silent = false) => {
    if (selectedProvider.value !== 'ollama' || isDetectingModels.value) return

    isDetectingModels.value = true
    if (!silent) errorMessage.value = ''

    try {
      const params = new URLSearchParams({ base_url: ollamaBaseUrl.value.trim() })
      const response = await fetch(`/api/ollama/models?${params.toString()}`)
      const payload = await response.json()
      if (!payload.ok) throw new Error(payload.error ?? 'Unable to detect Ollama models.')

      ollamaModels.value = payload.data.models
      if (!selectedModel.value.trim() && ollamaModels.value.length > 0) {
        selectedModel.value = ollamaModels.value[0]
      }
    } catch (error) {
      if (!silent) {
        errorMessage.value = error instanceof Error ? error.message : 'Unable to detect Ollama models.'
      }
    } finally {
      isDetectingModels.value = false
    }
  }

  const resetConversation = () => {
    messages.value = []
    draft.value = ''
    errorMessage.value = ''
    nextMessageId = 1
  }

  const sendMessage = async () => {
    const content = draft.value.trim()
    if (!content || isSending.value) return

    errorMessage.value = ''
    draft.value = ''
    messages.value.push({ id: nextMessageId++, role: 'user', content })
    await scrollToBottom()

    isSending.value = true
    try {
      const conversation = [
        { role: 'system', content: systemPrompt.value },
        ...messages.value.map(message => ({
          role: message.role,
          content: message.content,
        })),
      ]

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider.value,
          model: selectedModel.value.trim(),
          ollama_base_url: selectedProvider.value === 'ollama' ? ollamaBaseUrl.value.trim() : undefined,
          messages: conversation,
        }),
      })
      const payload = await response.json()
      if (!payload.ok) throw new Error(payload.error ?? 'The backend could not complete the chat request.')

      messages.value.push({
        id: nextMessageId++,
        role: 'assistant',
        content: payload.data.content,
      })
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Unexpected chat error.'
    } finally {
      isSending.value = false
      await scrollToBottom()
    }
  }

  watch(selectedProvider, () => {
    selectedModel.value = modelOptions.value[0] ?? ''
    if (selectedProvider.value === 'ollama') {
      detectOllamaModels(true)
    }
  })

  onMounted(async () => {
    await loadModels()
    await detectOllamaModels(true)
  })
</script>

<style scoped>
  .chat-page {
    min-height: 100vh;
    background:
      linear-gradient(135deg, rgba(0, 121, 107, 0.12), transparent 32%),
      linear-gradient(315deg, rgba(63, 81, 181, 0.1), transparent 36%),
      #f6f7f9;
    padding: 24px;
  }

  .chat-shell {
    display: grid;
    grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
    gap: 20px;
    height: calc(100vh - 48px);
  }

  .settings-panel,
  .conversation-panel {
    border: 1px solid rgba(31, 41, 55, 0.12);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
  }

  .settings-panel {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 22px;
  }

  .conversation-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto auto;
    min-width: 0;
    overflow: hidden;
  }

  .conversation-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid rgba(31, 41, 55, 0.1);
    padding: 20px 24px;
  }

  .eyebrow {
    color: #607d8b;
    font-size: 0.78rem;
    font-weight: 700;
    margin: 0 0 4px;
    text-transform: uppercase;
  }

  h1,
  h2 {
    color: #17212b;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1.15;
    margin: 0;
  }

  h1 {
    font-size: 1.75rem;
  }

  h2 {
    font-size: 1.25rem;
  }

  .provider-hint {
    line-height: 1.4;
  }

  .ollama-settings {
    display: grid;
    gap: 10px;
  }

  .message-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
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
    border-radius: 8px;
    max-width: min(720px, 86%);
    padding: 14px 16px;
  }

  .message-row--user .message-bubble {
    background: #0f766e;
    color: white;
  }

  .message-row--assistant .message-bubble {
    background: #eef2f7;
    color: #17212b;
  }

  .message-bubble span {
    display: block;
    font-size: 0.75rem;
    font-weight: 800;
    margin-bottom: 6px;
    opacity: 0.8;
    text-transform: uppercase;
  }

  .message-bubble p {
    margin: 0;
    white-space: pre-wrap;
  }

  .error-alert {
    margin: 0 24px 16px;
  }

  .composer {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 52px;
    gap: 12px;
    border-top: 1px solid rgba(31, 41, 55, 0.1);
    padding: 16px 24px 20px;
  }

  .send-button {
    align-self: end;
    height: 48px;
    min-width: 52px;
  }

  .status-chip {
    flex: 0 0 auto;
  }

  @media (max-width: 860px) {
    .chat-page {
      padding: 12px;
    }

    .chat-shell {
      grid-template-columns: 1fr;
      height: auto;
      min-height: calc(100vh - 24px);
    }

    .settings-panel {
      padding: 18px;
    }

    .conversation-panel {
      min-height: 680px;
    }

    .conversation-header {
      align-items: flex-start;
      flex-direction: column;
      padding: 18px;
    }

    .message-list {
      padding: 18px;
    }

    .message-bubble {
      max-width: 94%;
    }

    .composer {
      grid-template-columns: 1fr;
      padding: 14px 18px 18px;
    }

    .send-button {
      width: 100%;
    }
  }
</style>

<template>
  <v-container class="chat-page" fluid>
    <section class="workspace-shell">
      <aside class="workspace-panel model-panel">
        <header class="panel-header">
          <div>
            <p class="eyebrow">Git-like AI Chat</p>
            <h1>Workspace</h1>
          </div>

          <v-chip
            class="compact-chip"
            :color="isReady ? 'teal' : 'deep-orange'"
            prepend-icon="mdi-circle-medium"
            variant="tonal"
          >
            {{ isReady ? 'Ready' : 'Setup' }}
          </v-chip>
        </header>

        <div class="control-stack">
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
              :placeholder="defaultOllamaBaseUrl"
              prepend-inner-icon="mdi-link-variant"
              variant="outlined"
              @blur="detectOllamaModels(true)"
            />

            <v-btn
              class="action-button secondary-action"
              :loading="isDetectingModels"
              prepend-icon="mdi-magnify"
              variant="flat"
              @click="detectOllamaModels(false)"
            >
              Detect
            </v-btn>
          </div>

          <v-textarea
            v-model="systemPrompt"
            auto-grow
            density="comfortable"
            hide-details
            label="System prompt"
            rows="5"
            variant="outlined"
          />
        </div>

      </aside>

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
              {{ treeNodes.length }} nodes
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
            class="composer-input"
            density="comfortable"
            hide-details
            label="Message"
            max-rows="6"
            rows="2"
            variant="outlined"
            @keydown.enter.exact.prevent="sendMessage"
          />

          <v-tooltip text="Send" location="top">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
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

      <aside class="workspace-panel branch-panel">
        <header class="panel-header branch-header">
          <div>
            <p class="eyebrow">Branch</p>
            <h2>{{ currentNodeLabel }}</h2>
          </div>

          <div class="branch-tools">
            <v-tooltip text="New root" location="bottom">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  aria-label="New root"
                  class="icon-action"
                  icon="mdi-source-branch-plus"
                  variant="flat"
                  @click="startRootConversation"
                />
              </template>
            </v-tooltip>

            <v-tooltip text="Refresh tree" location="bottom">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  aria-label="Refresh tree"
                  class="icon-action"
                  :disabled="isLoadingTree"
                  icon="mdi-refresh"
                  :loading="isLoadingTree"
                  variant="flat"
                  @click="loadTree"
                />
              </template>
            </v-tooltip>

            <v-tooltip text="Clear database" location="bottom">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  aria-label="Clear database"
                  class="icon-action danger-action"
                  :disabled="isClearingDatabase || treeNodes.length === 0"
                  icon="mdi-trash-can-outline"
                  :loading="isClearingDatabase"
                  variant="flat"
                  @click="isClearDialogOpen = true"
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
            @click="selectNode(item.node.id)"
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

      <v-dialog v-model="isClearDialogOpen" max-width="420">
        <section class="confirm-dialog">
          <header>
            <v-icon icon="mdi-trash-can-outline" size="22" />
            <h2>Clear database</h2>
          </header>

          <p>
            This removes every saved conversation node from the backend database.
          </p>

          <div class="dialog-actions">
            <v-btn
              class="dialog-button"
              variant="text"
              @click="isClearDialogOpen = false"
            >
              Cancel
            </v-btn>

            <v-btn
              class="dialog-button danger-button"
              :loading="isClearingDatabase"
              prepend-icon="mdi-trash-can-outline"
              variant="flat"
              @click="clearDatabase"
            >
              Clear
            </v-btn>
          </div>
        </section>
      </v-dialog>
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

  type ConversationRole = 'user' | 'assistant'
  type NodeRole = ConversationRole | 'exchange'

  type ChatMessage = {
    id: string
    role: ConversationRole
    content: string
    nodeId?: number
    parentId?: number | null
    createdAt?: string | null
  }

  type MessageNode = {
    id: number
    parent_id: number | null
    role: NodeRole
    content: string
    user_content?: string | null
    assistant_content?: string | null
    created_at: string | null
    children: number[]
  }

  type ContextMessage = {
    role: ConversationRole
    content: string
    node_id?: number
    parent_id?: number | null
    created_at?: string | null
  }

  type TreePayload = {
    nodes: MessageNode[]
    roots: number[]
  }

  type ContextPayload = {
    node_id: number
    nodes: MessageNode[]
    messages: ContextMessage[]
  }

  type ChatResponsePayload = {
    role: ConversationRole
    content: string
    user: MessageNode | null
    assistant: MessageNode | null
    exchange?: MessageNode | null
    node: MessageNode | null
    current_node_id?: number | null
    currentNodeId?: number | null
  }

  type ApiResponse<T> = {
    ok: boolean
    data: T
    error?: string
  }

  type FlattenedNode = {
    node: MessageNode
    depth: number
  }

  const fallbackProviders: Provider[] = [
    {
      provider: 'ollama',
      label: 'Ollama',
      models: ['gemma3:4b', 'llama3.1', 'llama3', 'mistral', 'gemma2'],
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
  const defaultModel = 'gemma3:4b'
  const selectedModel = ref(defaultModel)
  const defaultOllamaBaseUrl = import.meta.env.VITE_OLLAMA_BASE_URL?.trim() || 'http://localhost:11434'
  const ollamaBaseUrl = ref(defaultOllamaBaseUrl)
  const ollamaModels = ref<string[]>([])
  const systemPrompt = ref('You are a concise assistant that keeps context clean and explicit.')
  const draft = ref('')
  const messages = ref<ChatMessage[]>([])
  const treeNodes = ref<MessageNode[]>([])
  const treeRoots = ref<number[]>([])
  const currentNodeId = ref<number | null>(null)
  const isSending = ref(false)
  const isDetectingModels = ref(false)
  const isLoadingTree = ref(false)
  const isLoadingContext = ref(false)
  const isClearingDatabase = ref(false)
  const isClearDialogOpen = ref(false)
  const errorMessage = ref('')
  const messageListRef = ref<HTMLElement | null>(null)
  let nextLocalMessageId = 1

  const activeProvider = computed(() =>
    providers.value.find(provider => provider.provider === selectedProvider.value) ?? providers.value[0]
  )

  const availableModels = computed(() => activeProvider.value?.models ?? [])

  const modelOptions = computed(() => {
    const detectedModels = selectedProvider.value === 'ollama' ? ollamaModels.value : []
    const defaults = selectedProvider.value === 'ollama' ? [defaultModel] : []
    return [...new Set([...defaults, ...detectedModels, ...availableModels.value])]
  })

  const activeModelLabel = computed(() => {
    if (!activeProvider.value || !selectedModel.value) return 'No model selected'
    return `${activeProvider.value.label} / ${selectedModel.value}`
  })

  const nodeById = computed(() => new Map(treeNodes.value.map(node => [node.id, node])))

  const currentNode = computed(() =>
    currentNodeId.value === null ? null : nodeById.value.get(currentNodeId.value) ?? null
  )

  const currentNodeLabel = computed(() => {
    if (!currentNode.value) return 'New root'
    return `${currentNode.value.role === 'exchange' ? 'Exchange' : currentNode.value.role} #${currentNode.value.id}`
  })

  const contextSummary = computed(() =>
    currentNodeId.value === null ? 'Root context' : `Node #${currentNodeId.value}`
  )

  const flattenedTreeNodes = computed<FlattenedNode[]>(() => {
    const rows: FlattenedNode[] = []
    const visited = new Set<number>()

    const visit = (nodeId: number, depth: number) => {
      if (visited.has(nodeId)) return

      const node = nodeById.value.get(nodeId)
      if (!node) return

      visited.add(nodeId)
      rows.push({ node, depth })

      for (const childId of node.children) {
        visit(childId, depth + 1)
      }
    }

    for (const rootId of treeRoots.value) {
      visit(rootId, 0)
    }

    for (const node of treeNodes.value) {
      visit(node.id, 0)
    }

    return rows
  })

  const isReady = computed(() => Boolean(activeProvider.value?.configured))

  const canSend = computed(() =>
    draft.value.trim().length > 0 &&
    selectedProvider.value.length > 0 &&
    selectedModel.value.trim().length > 0 &&
    !isSending.value &&
    !isLoadingContext.value
  )

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

  const assertOk = async <T>(response: Response, fallback: string): Promise<T> => {
    const payload = await response.json() as ApiResponse<T>
    if (!payload.ok) throw new Error(payload.error ?? fallback)
    return payload.data
  }

  const normalizeTreeNode = (node: MessageNode): MessageNode => ({
    ...node,
    children: Array.isArray(node.children) ? node.children : [],
  })

  const messageFromContextMessage = (message: ContextMessage, index: number): ChatMessage => ({
    id: `node-${message.node_id ?? 'local'}-${message.role}-${index}`,
    role: message.role,
    content: message.content,
    nodeId: message.node_id,
    parentId: message.parent_id,
    createdAt: message.created_at,
  })

  const scrollToBottom = async () => {
    await nextTick()
    if (!messageListRef.value) return
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }

  const loadModels = async () => {
    try {
      const response = await fetch('/api/models')
      providers.value = await assertOk<Provider[]>(response, 'Unable to load models.')
    } catch {
      providers.value = fallbackProviders
      errorMessage.value = 'Using local model defaults because the backend is not reachable.'
    }
  }

  const loadTree = async () => {
    isLoadingTree.value = true

    try {
      const response = await fetch('/api/tree')
      const data = await assertOk<TreePayload>(response, 'Unable to load conversation tree.')
      treeNodes.value = data.nodes.map(normalizeTreeNode)
      treeRoots.value = data.roots

      if (currentNodeId.value !== null && !nodeById.value.has(currentNodeId.value)) {
        await startRootConversation()
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Unable to load conversation tree.'
    } finally {
      isLoadingTree.value = false
    }
  }

  const loadContext = async (nodeId: number) => {
    isLoadingContext.value = true
    errorMessage.value = ''

    try {
      const response = await fetch(`/api/context/${nodeId}`)
      const data = await assertOk<ContextPayload>(response, 'Unable to load node context.')
      messages.value = data.messages.map(messageFromContextMessage)
      currentNodeId.value = data.node_id
      await scrollToBottom()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Unable to load node context.'
    } finally {
      isLoadingContext.value = false
    }
  }

  const selectNode = async (nodeId: number) => {
    if (nodeId === currentNodeId.value || isLoadingContext.value) return
    await loadContext(nodeId)
  }

  const startRootConversation = async () => {
    currentNodeId.value = null
    messages.value = []
    draft.value = ''
    errorMessage.value = ''
    await scrollToBottom()
  }

  const clearDatabase = async () => {
    if (isClearingDatabase.value) return

    isClearingDatabase.value = true
    errorMessage.value = ''

    try {
      const response = await fetch('/api/nodes', { method: 'DELETE' })
      await assertOk<{ deleted: number }>(response, 'Unable to clear database.')
      treeNodes.value = []
      treeRoots.value = []
      currentNodeId.value = null
      messages.value = []
      draft.value = ''
      isClearDialogOpen.value = false
      await scrollToBottom()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Unable to clear database.'
    } finally {
      isClearingDatabase.value = false
    }
  }

  const detectOllamaModels = async (silent = false) => {
    if (selectedProvider.value !== 'ollama' || isDetectingModels.value) return

    isDetectingModels.value = true
    if (!silent) errorMessage.value = ''

    try {
      const params = new URLSearchParams({ base_url: ollamaBaseUrl.value.trim() })
      const response = await fetch(`/api/ollama/models?${params.toString()}`)
      const data = await assertOk<{ models: string[] }>(response, 'Unable to detect Ollama models.')

      ollamaModels.value = data.models
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

  const sendMessage = async () => {
    const content = draft.value.trim()
    if (!content || isSending.value) return

    errorMessage.value = ''
    draft.value = ''

    const previousMessages = [...messages.value]
    messages.value.push({
      id: `local-${nextLocalMessageId++}`,
      role: 'user',
      content,
      parentId: currentNodeId.value,
    })
    await scrollToBottom()

    isSending.value = true
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider.value,
          model: selectedModel.value.trim(),
          ollama_base_url: selectedProvider.value === 'ollama' ? ollamaBaseUrl.value.trim() : undefined,
          system_prompt: systemPrompt.value,
          parent_id: currentNodeId.value,
          message: content,
        }),
      })
      const data = await assertOk<ChatResponsePayload>(response, 'The backend could not complete the chat request.')
      const nextNodeId = data.current_node_id ?? data.currentNodeId ?? data.assistant?.id ?? data.node?.id ?? null

      await loadTree()

      if (nextNodeId !== null) {
        await loadContext(nextNodeId)
      } else {
        messages.value = [
          ...previousMessages,
          {
            id: `local-${nextLocalMessageId++}`,
            role: 'assistant',
            content: data.content,
          },
        ]
      }
    } catch (error) {
      messages.value = previousMessages
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
    await loadTree()
    await detectOllamaModels(true)
  })
</script>

<style scoped>
  :global(html),
  :global(body),
  :global(#app),
  :global(.v-application),
  :global(.v-application__wrap) {
    height: 100%;
    margin: 0;
    min-height: 0;
    overflow: hidden;
  }

  :global(.v-main) {
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  :global(body),
  :global(.v-application) {
    background: #0b1120;
  }

  :global(.v-overlay-container .v-list) {
    background: #111827;
    border: 1px solid rgba(148, 163, 184, 0.24);
    color: #f8fafc;
  }

  :global(.v-overlay-container .v-list-item-title),
  :global(.v-overlay-container .v-list-item-subtitle) {
    color: #f8fafc;
  }

  :global(.v-overlay-container .v-list-item--active),
  :global(.v-overlay-container .v-list-item:hover) {
    background: rgba(45, 212, 191, 0.16);
  }

  :global(.v-tooltip .v-overlay__content) {
    background: #020617;
    border: 1px solid rgba(148, 163, 184, 0.24);
    color: #f8fafc;
  }

  .chat-page {
    --app-bg: #0b1120;
    --app-bg-accent-a: rgba(45, 212, 191, 0.11);
    --app-bg-accent-b: rgba(129, 140, 248, 0.1);
    --assistant-accent: #818cf8;
    --assistant-bubble-bg: #1e293b;
    --assistant-bubble-text: #f8fafc;
    --assistant-node-bg: rgba(129, 140, 248, 0.16);
    --exchange-accent: #f59e0b;
    --exchange-node-bg: rgba(245, 158, 11, 0.14);
    --border: rgba(148, 163, 184, 0.24);
    --border-soft: rgba(148, 163, 184, 0.16);
    --button-primary-bg: #2dd4bf;
    --button-primary-hover: #5eead4;
    --button-primary-text: #042f2e;
    --button-secondary-bg: rgba(45, 212, 191, 0.14);
    --button-secondary-hover: rgba(45, 212, 191, 0.22);
    --button-secondary-text: #ccfbf1;
    --chip-bg: rgba(148, 163, 184, 0.14);
    --chip-text: #f8fafc;
    --field-bg: #111827;
    --field-bg-focus: #0f172a;
    --icon-button-bg: rgba(148, 163, 184, 0.14);
    --icon-button-hover: rgba(148, 163, 184, 0.24);
    --icon-button-text: #f8fafc;
    --danger-bg: rgba(248, 113, 113, 0.14);
    --danger-bg-hover: rgba(248, 113, 113, 0.24);
    --danger-border: rgba(248, 113, 113, 0.34);
    --danger-text: #fecaca;
    --primary: #14b8a6;
    --primary-node-bg: rgba(20, 184, 166, 0.16);
    --shadow: 0 18px 48px rgba(0, 0, 0, 0.36);
    --surface: #0f172a;
    --surface-raised: #111827;
    --text-muted: #cbd5e1;
    --text-subtle: #94a3b8;
    --text-strong: #f8fafc;
    --user-bubble-bg: #115e59;
    --user-bubble-text: #ecfeff;
    box-sizing: border-box;
    color: var(--text-strong);
    color-scheme: dark;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    width: 100%;
    background:
      linear-gradient(135deg, var(--app-bg-accent-a), transparent 30%),
      linear-gradient(315deg, var(--app-bg-accent-b), transparent 34%),
      var(--app-bg);
    padding: 18px;
  }

  .workspace-shell {
    display: grid;
    grid-template-columns: minmax(260px, 300px) minmax(0, 1fr) minmax(280px, 340px);
    gap: 14px;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .workspace-panel {
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow);
    color: var(--text-strong);
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  :deep(.v-field) {
    background: var(--field-bg);
    border-radius: 8px;
    color: var(--text-strong);
  }

  :deep(.v-field:hover),
  :deep(.v-field--focused) {
    background: var(--field-bg-focus);
  }

  :deep(.v-field__append-inner),
  :deep(.v-field__clearable),
  :deep(.v-field__input),
  :deep(.v-label),
  :deep(.v-select__selection-text),
  :deep(input),
  :deep(textarea) {
    color: var(--text-strong);
  }

  :deep(.v-field__outline) {
    color: var(--border);
  }

  :deep(.v-messages),
  :deep(.v-field__prepend-inner) {
    color: var(--text-subtle);
  }

  :deep(.v-chip),
  .compact-chip {
    background: var(--chip-bg);
    color: var(--chip-text);
  }

  :deep(.v-alert) {
    background: rgba(14, 165, 233, 0.12);
    border: 1px solid rgba(125, 211, 252, 0.28);
    color: var(--text-strong);
  }

  :deep(.v-alert__content),
  :deep(.v-alert__prepend),
  :deep(.v-alert__close) {
    color: var(--text-strong);
  }

  .model-panel,
  .branch-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
    overflow: hidden;
    padding: 18px;
  }

  .model-panel {
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .conversation-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto auto;
    min-height: 0;
    overflow: hidden;
  }

  .panel-header,
  .conversation-header {
    align-items: center;
    display: flex;
    gap: 14px;
    justify-content: space-between;
  }

  .conversation-header {
    border-bottom: 1px solid var(--border-soft);
    padding: 18px 20px;
  }

  .conversation-title {
    min-width: 0;
  }

  .conversation-title h2 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .conversation-status,
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

  h1,
  h2 {
    color: var(--text-strong);
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1.15;
    margin: 0;
  }

  h1 {
    font-size: 1.6rem;
  }

  h2 {
    font-size: 1.05rem;
  }

  .compact-chip {
    flex: 0 0 auto;
    font-weight: 700;
  }

  .control-stack {
    display: grid;
    gap: 12px;
  }

  .ollama-settings {
    display: grid;
    gap: 10px;
  }

  .action-button,
  .icon-action,
  .send-button {
    border-radius: 8px;
    box-shadow: none;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: none;
  }

  .action-button {
    height: 40px;
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

  .secondary-action {
    background: var(--button-secondary-bg);
    border: 1px solid var(--border);
    color: var(--button-secondary-text);
  }

  .secondary-action :deep(.v-btn__content),
  .secondary-action :deep(.v-icon) {
    color: var(--button-secondary-text);
  }

  .secondary-action:hover {
    background: var(--button-secondary-hover);
  }

  .icon-action {
    background: var(--icon-button-bg);
    color: var(--icon-button-text);
    height: 38px;
    min-width: 38px;
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

  .confirm-dialog {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: var(--shadow);
    color: var(--text-strong);
    display: grid;
    gap: 16px;
    padding: 20px;
  }

  .confirm-dialog header {
    align-items: center;
    color: var(--danger-text);
    display: flex;
    gap: 10px;
  }

  .confirm-dialog p {
    color: var(--text-muted);
    line-height: 1.5;
    margin: 0;
  }

  .dialog-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .dialog-button {
    border-radius: 8px;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: none;
  }

  .dialog-button :deep(.v-btn__content),
  .dialog-button :deep(.v-icon) {
    color: var(--text-strong);
  }

  .danger-button {
    background: #ef4444;
    color: #ffffff;
  }

  .danger-button :deep(.v-btn__content),
  .danger-button :deep(.v-icon) {
    color: #ffffff;
  }

  .danger-button:hover {
    background: #f87171;
  }

  .branch-header {
    border-bottom: 1px solid var(--border-soft);
    margin: -2px 0 0;
    padding-bottom: 14px;
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
    display: grid;
    flex: 1;
    gap: 8px;
    align-content: start;
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

  .empty-tree,
  .empty-context {
    align-self: center;
    color: var(--text-subtle);
    font-weight: 800;
    margin: 0;
    text-align: center;
  }

  .empty-context {
    justify-self: center;
    padding: 24px;
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
    border-color: var(--primary);
    background: var(--primary-node-bg);
  }

  .branch-node--assistant:hover:not(:disabled),
  .branch-node--assistant.branch-node--active {
    border-color: var(--assistant-accent);
    background: var(--assistant-node-bg);
  }

  .branch-node--exchange:hover:not(:disabled),
  .branch-node--exchange.branch-node--active {
    border-color: var(--exchange-accent);
    background: var(--exchange-node-bg);
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

  .message-bubble p {
    margin: 0;
    white-space: pre-wrap;
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
    height: 48px;
    min-width: 48px;
    width: 48px;
  }

  @media (max-width: 1180px) {
    .workspace-shell {
      grid-template-columns: minmax(250px, 300px) minmax(0, 1fr);
      grid-template-rows: minmax(0, 1fr) minmax(190px, 32%);
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }

    .branch-panel {
      grid-column: 1 / -1;
      min-height: 0;
    }

    .branch-tree {
      max-height: none;
    }
  }

  @media (max-width: 820px) {
    .chat-page {
      padding: 10px;
    }

    .workspace-shell {
      grid-template-columns: 1fr;
      grid-template-rows: minmax(150px, 25%) minmax(0, 1fr) minmax(150px, 24%);
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }

    .model-panel,
    .branch-panel {
      overflow: hidden;
      padding: 16px;
    }

    .model-panel {
      overflow-y: auto;
      overscroll-behavior: contain;
    }

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

<template>
  <v-container class="chat-page" fluid>
    <section class="workspace-shell">
      <ModelSettingsPanel
        v-model:ollama-base-url="ollamaBaseUrl"
        v-model:selected-model="selectedModel"
        v-model:selected-provider="selectedProvider"
        v-model:system-prompt="systemPrompt"
        :default-ollama-base-url="defaultOllamaBaseUrl"
        :is-detecting-models="isDetectingModels"
        :is-ready="isReady"
        :model-options="modelOptions"
        :providers="providers"
        @detect-models="detectOllamaModels"
      />

      <ConversationPanel
        ref="conversationPanelRef"
        v-model:draft="draft"
        :active-model-label="activeModelLabel"
        :can-send="canSend"
        :context-summary="contextSummary"
        :error-message="errorMessage"
        :is-loading-context="isLoadingContext"
        :is-sending="isSending"
        :messages="messages"
        :node-count="treeNodes.length"
        @dismiss-error="errorMessage = ''"
        @send="sendMessage"
      />

      <BranchPanel
        :current-node-id="currentNodeId"
        :current-node-label="currentNodeLabel"
        :flattened-tree-nodes="flattenedTreeNodes"
        :is-clearing-database="isClearingDatabase"
        :is-loading-context="isLoadingContext"
        :is-loading-tree="isLoadingTree"
        :tree-nodes="treeNodes"
        :tree-roots="treeRoots"
        @clear-requested="isClearDialogOpen = true"
        @refresh-tree="loadTree"
        @select-node="selectNode"
        @start-root="startRootConversation"
      />

      <ClearDatabaseDialog
        v-model="isClearDialogOpen"
        :is-clearing-database="isClearingDatabase"
        @confirm="clearDatabase"
      />
    </section>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import BranchPanel from '@/components/chat/BranchPanel.vue'
  import ClearDatabaseDialog from '@/components/chat/ClearDatabaseDialog.vue'
  import ConversationPanel from '@/components/chat/ConversationPanel.vue'
  import ModelSettingsPanel from '@/components/chat/ModelSettingsPanel.vue'
  import type {
    ApiResponse,
    ChatMessage,
    ChatResponsePayload,
    ContextMessage,
    ContextPayload,
    FlattenedNode,
    MessageNode,
    Provider,
    TreePayload,
  } from '@/types/chat'

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
  const conversationPanelRef = ref<InstanceType<typeof ConversationPanel> | null>(null)
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
    await conversationPanelRef.value?.scrollToBottom()
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
    background:
      linear-gradient(135deg, var(--app-bg-accent-a), transparent 30%),
      linear-gradient(315deg, var(--app-bg-accent-b), transparent 34%),
      var(--app-bg);
    box-sizing: border-box;
    color: var(--text-strong);
    color-scheme: dark;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    padding: 18px;
    width: 100%;
  }

  .workspace-shell {
    display: grid;
    gap: 14px;
    grid-template-columns: minmax(260px, 300px) minmax(0, 1fr) minmax(280px, 340px);
    height: 100%;
    min-height: 0;
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

  :deep(.v-chip) {
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

  @media (max-width: 1180px) {
    .workspace-shell {
      grid-template-columns: minmax(250px, 300px) minmax(0, 1fr);
      grid-template-rows: minmax(0, 1fr) minmax(190px, 32%);
      height: 100%;
      min-height: 0;
      overflow: hidden;
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
  }
</style>

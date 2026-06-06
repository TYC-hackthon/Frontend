<template>
  <v-container class="chat-page" fluid>
    <div v-if="isCheckingSession" class="session-shell">
      <v-progress-circular indeterminate size="42" />
    </div>

    <AuthPanel
      v-else-if="!currentUser"
      :error-message="authErrorMessage"
      :is-submitting="isAuthSubmitting"
      :needs-setup="needsSetup"
      @login="login"
      @setup="setupAdmin"
    />

    <section v-else class="workspace-shell">
      <ModelSettingsPanel
        v-model:ollama-base-url="ollamaBaseUrl"
        v-model:selected-model="selectedModel"
        v-model:selected-provider="selectedProvider"
        v-model:system-prompt="systemPrompt"
        :current-username="currentUser.username"
        :default-ollama-base-url="defaultOllamaBaseUrl"
        :is-admin="currentUser.is_admin"
        :is-detecting-models="isDetectingModels"
        :is-ready="isReady"
        :model-options="modelOptions"
        :providers="providers"
        @detect-models="detectOllamaModels"
        @logout="logout"
        @open-admin="openAdminPanel"
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
        :is-new-root-draft-active="isNewRootDraftActive"
        :tree-root-options="treeRootOptions"
        :tree-nodes="treeNodes"
        :tree-roots="treeRoots"
        @clear-requested="isClearDialogOpen = true"
        @refresh-tree="loadTree"
        @select-node="selectNode"
        @select-root-tree="selectRootTree"
        @start-root="startRootConversation"
      />

      <ClearDatabaseDialog
        v-model="isClearDialogOpen"
        :is-clearing-database="isClearingDatabase"
        @confirm="clearDatabase"
      />

      <AdminPanel
        v-if="currentUser.is_admin"
        v-model="isAdminPanelOpen"
        :error-message="adminErrorMessage"
        :is-loading="isLoadingAdminUsers"
        :is-saving="isSavingAdmin"
        :users="adminUsers"
        @clear-user-nodes="clearUserNodes"
        @create-user="createUser"
        @dismiss-error="adminErrorMessage = ''"
        @refresh="loadAdminUsers"
        @update-user="updateUser"
      />
    </section>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import AdminPanel from '@/components/chat/AdminPanel.vue'
  import AuthPanel from '@/components/chat/AuthPanel.vue'
  import BranchPanel from '@/components/chat/BranchPanel.vue'
  import ClearDatabaseDialog from '@/components/chat/ClearDatabaseDialog.vue'
  import ConversationPanel from '@/components/chat/ConversationPanel.vue'
  import ModelSettingsPanel from '@/components/chat/ModelSettingsPanel.vue'
  import type {
    AdminUsersPayload,
    ApiResponse,
    AuthStatusPayload,
    AuthUser,
    ChatMessage,
    ChatResponsePayload,
    ContextMessage,
    ContextPayload,
    CreateUserPayload,
    FlattenedNode,
    MessageNode,
    Provider,
    RootTreeOption,
    TreePayload,
    UpdateUserPayload,
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

  const currentUser = ref<AuthUser | null>(null)
  const needsSetup = ref(false)
  const isCheckingSession = ref(true)
  const isAuthSubmitting = ref(false)
  const authErrorMessage = ref('')
  const isAdminPanelOpen = ref(false)
  const adminUsers = ref<AuthUser[]>([])
  const isLoadingAdminUsers = ref(false)
  const isSavingAdmin = ref(false)
  const adminErrorMessage = ref('')
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
  const activeTreeRootId = ref<number | null>(null)
  const isNewRootDraftActive = ref(false)
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

  const rootIdForNode = (nodeId: number | null) => {
    if (nodeId === null) return null

    let currentId: number | null = nodeId
    const visited = new Set<number>()

    while (currentId !== null && !visited.has(currentId)) {
      visited.add(currentId)
      const node = nodeById.value.get(currentId)
      if (!node) return null
      if (node.parent_id === null) return node.id
      currentId = node.parent_id
    }

    return null
  }

  const currentNode = computed(() =>
    currentNodeId.value === null ? null : nodeById.value.get(currentNodeId.value) ?? null
  )

  const visibleTreeRootId = computed(() => {
    if (
      isNewRootDraftActive.value &&
      activeTreeRootId.value === null &&
      currentNodeId.value === null
    ) {
      return null
    }

    if (activeTreeRootId.value !== null && treeRoots.value.includes(activeTreeRootId.value)) {
      return activeTreeRootId.value
    }

    const currentRootId = rootIdForNode(currentNodeId.value)
    if (currentRootId !== null && treeRoots.value.includes(currentRootId)) {
      return currentRootId
    }

    return treeRoots.value[0] ?? null
  })

  const currentNodeLabel = computed(() => {
    if (!currentNode.value) return 'New root'
    return `${currentNode.value.role === 'exchange' ? 'Exchange' : currentNode.value.role} #${currentNode.value.id}`
  })

  const contextSummary = computed(() =>
    currentNodeId.value === null ? 'Root context' : `Node #${currentNodeId.value}`
  )

  const nodePreviewText = (node: MessageNode) => {
    const compact = [node.user_content, node.assistant_content]
      .filter(Boolean)
      .join(' / ')
      .trim() || node.content
    const normalized = compact.replace(/\s+/g, ' ').trim()
    if (!normalized) return `Node #${node.id}`
    return normalized.length > 42 ? `${normalized.slice(0, 42)}...` : normalized
  }

  const treeRootOptions = computed<RootTreeOption[]>(() =>
    treeRoots.value.flatMap((rootId, index) => {
      const root = nodeById.value.get(rootId)
      if (!root) return []

      return [{
        id: rootId,
        isCurrent: visibleTreeRootId.value === rootId,
        label: `Root ${index + 1}`,
        preview: nodePreviewText(root),
      }]
    })
  )

  type BranchStyle = {
    color: string
    ringColor: string
  }

  const branchPalette: BranchStyle[] = [
    { color: '#14b8a6', ringColor: 'rgba(20, 184, 166, 0.28)' },
    { color: '#f97316', ringColor: 'rgba(249, 115, 22, 0.28)' },
    { color: '#818cf8', ringColor: 'rgba(129, 140, 248, 0.28)' },
    { color: '#22c55e', ringColor: 'rgba(34, 197, 94, 0.26)' },
    { color: '#e879f9', ringColor: 'rgba(232, 121, 249, 0.28)' },
    { color: '#38bdf8', ringColor: 'rgba(56, 189, 248, 0.28)' },
    { color: '#facc15', ringColor: 'rgba(250, 204, 21, 0.24)' },
    { color: '#fb7185', ringColor: 'rgba(251, 113, 133, 0.28)' },
  ]

  const flattenedTreeNodes = computed<FlattenedNode[]>(() => {
    type RawGraphRow = Omit<FlattenedNode, 'graphColumnCount' | 'graphLanes'> & {
      laneStyles: Map<number, BranchStyle>
      openLanes: number[]
    }

    const rows: RawGraphRow[] = []
    const visited = new Set<number>()
    let maxLane = 0
    let nextPaletteIndex = 0

    if (visibleTreeRootId.value === null) return []

    const nextBranchStyle = () => {
      const style = branchPalette[nextPaletteIndex % branchPalette.length]
      nextPaletteIndex += 1
      return style
    }

    const nextAvailableLane = (usedLanes: Set<number>, afterLane: number) => {
      let lane = afterLane + 1

      while (usedLanes.has(lane)) {
        lane += 1
      }

      usedLanes.add(lane)
      return lane
    }

    const visit = (
      nodeId: number,
      depth: number,
      lane: number,
      branchStyle: BranchStyle,
      openLanes: Map<number, BranchStyle>,
      parentLane: number | null,
    ) => {
      if (visited.has(nodeId)) return

      const node = nodeById.value.get(nodeId)
      if (!node) return

      visited.add(nodeId)
      maxLane = Math.max(maxLane, lane, ...openLanes.keys())

      const childIds = node.children.filter(childId => nodeById.value.has(childId))
      const usedLanes = new Set([...openLanes.keys(), lane])
      const childLanes = childIds.map((_, index) =>
        index === 0 ? lane : nextAvailableLane(usedLanes, lane)
      )
      const childBranchStyles = childLanes.map((_, index) =>
        index === 0 ? branchStyle : nextBranchStyle()
      )
      const forkLanes = childLanes.slice(1)
      const laneStyles = new Map(openLanes)

      laneStyles.set(lane, branchStyle)
      forkLanes.forEach((forkLane, index) => {
        laneStyles.set(forkLane, childBranchStyles[index + 1])
      })

      maxLane = Math.max(maxLane, lane, ...childLanes, ...forkLanes)

      rows.push({
        branchColor: branchStyle.color,
        branchRingColor: branchStyle.ringColor,
        node,
        depth,
        forkLanes,
        hasChildren: childIds.length > 0,
        lane,
        laneStyles,
        openLanes: [...openLanes.keys()],
        parentLane,
      })

      const pendingSiblingLanes = new Map(openLanes)
      forkLanes.forEach((forkLane, index) => {
        pendingSiblingLanes.set(forkLane, childBranchStyles[index + 1])
      })

      childIds.forEach((childId, index) => {
        const childLane = childLanes[index]
        const childOpenLanes = new Map(pendingSiblingLanes)
        childOpenLanes.delete(childLane)

        visit(childId, depth + 1, childLane, childBranchStyles[index], childOpenLanes, lane)
        pendingSiblingLanes.delete(childLane)
      })
    }

    visit(visibleTreeRootId.value, 0, 0, nextBranchStyle(), new Map(), null)

    const graphColumnCount = maxLane + 1

    return rows.map(({ laneStyles, openLanes, ...row }) => {
      const openLaneSet = new Set(openLanes)
      const forkLaneSet = new Set(row.forkLanes)

      return {
        ...row,
        graphColumnCount,
        graphLanes: Array.from({ length: graphColumnCount }, (_, index) => {
          const laneStyle = laneStyles.get(index) ?? branchPalette[0]

          return {
            color: laneStyle.color,
            index,
            isForkTarget: forkLaneSet.has(index),
            isNode: index === row.lane,
            isThrough: openLaneSet.has(index),
          }
        }),
      }
    })
  })

  const isReady = computed(() => Boolean(activeProvider.value?.configured))

  const canSend = computed(() =>
    currentUser.value !== null &&
    draft.value.trim().length > 0 &&
    selectedProvider.value.length > 0 &&
    selectedModel.value.trim().length > 0 &&
    !isSending.value &&
    !isLoadingContext.value
  )

  const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
    fetch(input, { ...init, credentials: 'include' })

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

  const syncActiveTreeRoot = () => {
    const currentRootId = rootIdForNode(currentNodeId.value)

    if (currentRootId !== null && treeRoots.value.includes(currentRootId)) {
      activeTreeRootId.value = currentRootId
      isNewRootDraftActive.value = false
      return
    }

    if (activeTreeRootId.value !== null && treeRoots.value.includes(activeTreeRootId.value)) {
      return
    }

    if (isNewRootDraftActive.value) {
      activeTreeRootId.value = null
      return
    }

    activeTreeRootId.value = treeRoots.value[0] ?? null
  }

  const resetWorkspaceState = () => {
    messages.value = []
    treeNodes.value = []
    treeRoots.value = []
    activeTreeRootId.value = null
    currentNodeId.value = null
    isNewRootDraftActive.value = false
    draft.value = ''
    errorMessage.value = ''
    isClearDialogOpen.value = false
    isAdminPanelOpen.value = false
    adminUsers.value = []
    adminErrorMessage.value = ''
  }

  const loadModels = async () => {
    try {
      const response = await apiFetch('/api/models')
      providers.value = await assertOk<Provider[]>(response, 'Unable to load models.')
    } catch {
      providers.value = fallbackProviders
      errorMessage.value = 'Using local model defaults because the backend is not reachable.'
    }
  }

  const loadTree = async () => {
    isLoadingTree.value = true

    try {
      const response = await apiFetch('/api/tree')
      const data = await assertOk<TreePayload>(response, 'Unable to load conversation tree.')
      treeNodes.value = data.nodes.map(normalizeTreeNode)
      treeRoots.value = data.roots

      if (currentNodeId.value !== null && !nodeById.value.has(currentNodeId.value)) {
        await startRootConversation()
      }

      syncActiveTreeRoot()
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
      const response = await apiFetch(`/api/context/${nodeId}`)
      const data = await assertOk<ContextPayload>(response, 'Unable to load node context.')
      messages.value = data.messages.map(messageFromContextMessage)
      currentNodeId.value = data.node_id
      activeTreeRootId.value = rootIdForNode(data.node_id)
      isNewRootDraftActive.value = false
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

  const selectRootTree = async (rootId: number) => {
    if (isLoadingContext.value) return

    activeTreeRootId.value = rootId
    isNewRootDraftActive.value = false

    if (rootId !== currentNodeId.value) {
      await loadContext(rootId)
    }
  }

  const startRootConversation = async () => {
    activeTreeRootId.value = null
    currentNodeId.value = null
    isNewRootDraftActive.value = true
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
      const response = await apiFetch('/api/nodes', { method: 'DELETE' })
      await assertOk<{ deleted: number }>(response, 'Unable to clear history.')
      treeNodes.value = []
      treeRoots.value = []
      activeTreeRootId.value = null
      currentNodeId.value = null
      isNewRootDraftActive.value = false
      messages.value = []
      draft.value = ''
      isClearDialogOpen.value = false
      await scrollToBottom()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Unable to clear history.'
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
      const response = await apiFetch(`/api/ollama/models?${params.toString()}`)
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

  const applyAuthPayload = (data: AuthStatusPayload) => {
    needsSetup.value = data.needs_setup
    currentUser.value = data.authenticated ? data.user : null
    if (!currentUser.value) {
      resetWorkspaceState()
    }
  }

  const loadWorkspace = async () => {
    await loadModels()
    await loadTree()
    if (currentNodeId.value === null && activeTreeRootId.value !== null) {
      await loadContext(activeTreeRootId.value)
    }
    await detectOllamaModels(true)
  }

  const loadSession = async () => {
    isCheckingSession.value = true
    authErrorMessage.value = ''

    try {
      const response = await apiFetch('/api/auth/status')
      const data = await assertOk<AuthStatusPayload>(response, 'Unable to read session.')
      applyAuthPayload(data)

      if (currentUser.value) {
        await loadWorkspace()
      }
    } catch (error) {
      currentUser.value = null
      authErrorMessage.value = error instanceof Error ? error.message : 'Unable to read session.'
      resetWorkspaceState()
    } finally {
      isCheckingSession.value = false
    }
  }

  const completeAuth = async (endpoint: string, payload: { username: string; password: string }) => {
    isAuthSubmitting.value = true
    authErrorMessage.value = ''

    try {
      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await assertOk<AuthStatusPayload>(response, 'Authentication failed.')
      applyAuthPayload(data)
      resetWorkspaceState()

      if (currentUser.value) {
        await loadWorkspace()
      }
    } catch (error) {
      authErrorMessage.value = error instanceof Error ? error.message : 'Authentication failed.'
    } finally {
      isAuthSubmitting.value = false
    }
  }

  const login = async (payload: { username: string; password: string }) => {
    await completeAuth('/api/auth/login', payload)
  }

  const setupAdmin = async (payload: { username: string; password: string }) => {
    await completeAuth('/api/auth/setup', payload)
  }

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } finally {
      currentUser.value = null
      needsSetup.value = false
      resetWorkspaceState()
    }
  }

  const loadAdminUsers = async () => {
    if (!currentUser.value?.is_admin) return

    isLoadingAdminUsers.value = true
    adminErrorMessage.value = ''

    try {
      const response = await apiFetch('/api/admin/users')
      const data = await assertOk<AdminUsersPayload>(response, 'Unable to load users.')
      adminUsers.value = data.users
    } catch (error) {
      adminErrorMessage.value = error instanceof Error ? error.message : 'Unable to load users.'
    } finally {
      isLoadingAdminUsers.value = false
    }
  }

  const openAdminPanel = async () => {
    isAdminPanelOpen.value = true
    await loadAdminUsers()
  }

  const createUser = async (payload: CreateUserPayload) => {
    if (!currentUser.value?.is_admin || isSavingAdmin.value) return

    isSavingAdmin.value = true
    adminErrorMessage.value = ''

    try {
      const response = await apiFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      await assertOk<{ user: AuthUser }>(response, 'Unable to create user.')
      await loadAdminUsers()
    } catch (error) {
      adminErrorMessage.value = error instanceof Error ? error.message : 'Unable to create user.'
    } finally {
      isSavingAdmin.value = false
    }
  }

  const updateUser = async (userId: number, payload: UpdateUserPayload) => {
    if (!currentUser.value?.is_admin || isSavingAdmin.value) return

    isSavingAdmin.value = true
    adminErrorMessage.value = ''

    try {
      const response = await apiFetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await assertOk<{ user: AuthUser }>(response, 'Unable to update user.')
      if (currentUser.value?.id === data.user.id) {
        currentUser.value = data.user
      }
      await loadAdminUsers()
    } catch (error) {
      adminErrorMessage.value = error instanceof Error ? error.message : 'Unable to update user.'
    } finally {
      isSavingAdmin.value = false
    }
  }

  const clearUserNodes = async (userId: number) => {
    if (!currentUser.value?.is_admin || isSavingAdmin.value) return

    isSavingAdmin.value = true
    adminErrorMessage.value = ''

    try {
      const response = await apiFetch(`/api/admin/users/${userId}/nodes`, { method: 'DELETE' })
      await assertOk<{ deleted: number }>(response, 'Unable to clear conversations.')

      if (currentUser.value.id === userId) {
        await startRootConversation()
        await loadTree()
      }
      await loadAdminUsers()
    } catch (error) {
      adminErrorMessage.value = error instanceof Error ? error.message : 'Unable to clear conversations.'
    } finally {
      isSavingAdmin.value = false
    }
  }

  const sendMessage = async () => {
    const content = draft.value.trim()
    if (!content || isSending.value || !currentUser.value) return

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
      const response = await apiFetch('/api/chat', {
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
    await loadSession()
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

  .session-shell {
    align-items: center;
    color: var(--text-strong);
    display: grid;
    height: 100%;
    justify-items: center;
    min-height: 0;
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

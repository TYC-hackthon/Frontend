export type Provider = {
  provider: string
  label: string
  models: string[]
  configured: boolean
  hint: string
}

export type ConversationRole = 'user' | 'assistant'
export type NodeRole = ConversationRole | 'exchange'

export type ChatMessage = {
  id: string
  role: ConversationRole
  content: string
  nodeId?: number
  parentId?: number | null
  createdAt?: string | null
}

export type MessageNode = {
  id: number
  parent_id: number | null
  role: NodeRole
  content: string
  user_content?: string | null
  assistant_content?: string | null
  created_at: string | null
  children: number[]
}

export type ContextMessage = {
  role: ConversationRole
  content: string
  node_id?: number
  parent_id?: number | null
  created_at?: string | null
}

export type TreePayload = {
  nodes: MessageNode[]
  roots: number[]
}

export type ContextPayload = {
  node_id: number
  nodes: MessageNode[]
  messages: ContextMessage[]
}

export type ChatResponsePayload = {
  role: ConversationRole
  content: string
  user: MessageNode | null
  assistant: MessageNode | null
  exchange?: MessageNode | null
  node: MessageNode | null
  current_node_id?: number | null
  currentNodeId?: number | null
}

export type ApiResponse<T> = {
  ok: boolean
  data: T
  error?: string
}

export type FlattenedNode = {
  node: MessageNode
  depth: number
}

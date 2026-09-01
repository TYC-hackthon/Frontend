export type Provider = {
  provider: string
  label: string
  models: string[]
  configured: boolean
  hint: string
}

export type AuthUser = {
  id: number
  username: string
  is_admin: boolean
  is_active: boolean
  created_at: string | null
  node_count?: number
}

export type AuthStatusPayload = {
  authenticated: boolean
  needs_setup: boolean
  user: AuthUser | null
}

export type AdminUsersPayload = {
  users: AuthUser[]
}

export type CreateUserPayload = {
  username: string
  password: string
  is_admin: boolean
}

export type UpdateUserPayload = {
  password?: string
  is_admin?: boolean
  is_active?: boolean
}

export type ConversationRole = 'user' | 'assistant'
export type NodeRole = ConversationRole | 'exchange' | 'merge'

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
  merge_parent_a_id?: number | null
  merge_parent_b_id?: number | null
  role: NodeRole
  content: string
  user_content?: string | null
  assistant_content?: string | null
  created_at: string | null
  children: number[]
}

export type BranchInfo = {
  node_id: number
  summary: string | null
  tags: string[]
  description: string | null
  has_embedding: boolean
  embedding_model: string | null
  created_at: string | null
  updated_at: string | null
}

export type MergeRecommendation = {
  node_id: number
  similarity: number
  summary: string | null
  tags: string[]
  description: string | null
  is_leaf?: boolean
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

export type RootTreeOption = {
  id: number
  isCurrent: boolean
  label: string
  preview: string
}

export type GraphLane = {
  color: string
  index: number
  isForkTarget: boolean
  isNode: boolean
  isThrough: boolean
}

export type FlattenedNode = {
  branchColor: string
  branchRingColor: string
  node: MessageNode
  depth: number
  forkLanes: number[]
  graphColumnCount: number
  graphLanes: GraphLane[]
  hasChildren: boolean
  lane: number
  mergeLanes: number[]
  parentLane: number | null
  branchInfo?: BranchInfo | null
}

export type BranchDiffPayload = {
  node_a_id: number
  node_b_id: number
  similarity: number | null
  lca_node: MessageNode | null
  branch_a_nodes: MessageNode[]
  branch_b_nodes: MessageNode[]
  summary_a: string | null
  summary_b: string | null
  tags_a: string[]
  tags_b: string[]
}

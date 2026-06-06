<template>
  <v-dialog
    :model-value="modelValue"
    max-width="980"
    scrollable
    @update:model-value="emit('update:modelValue', Boolean($event))"
  >
    <v-sheet class="admin-panel">
      <header class="admin-header">
        <div>
          <p class="eyebrow">Administration</p>
          <h2>Users</h2>
        </div>

        <div class="admin-tools">
          <v-tooltip text="Refresh users" location="bottom">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                aria-label="Refresh users"
                class="icon-action"
                :loading="isLoading"
                icon="mdi-refresh"
                variant="flat"
                @click="emit('refresh')"
              />
            </template>
          </v-tooltip>

          <v-tooltip text="Close" location="bottom">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                aria-label="Close"
                class="icon-action"
                icon="mdi-close"
                variant="flat"
                @click="emit('update:modelValue', false)"
              />
            </template>
          </v-tooltip>
        </div>
      </header>

      <v-alert
        v-if="errorMessage"
        closable
        density="compact"
        type="error"
        variant="tonal"
        @click:close="emit('dismissError')"
      >
        {{ errorMessage }}
      </v-alert>

      <form class="create-user" @submit.prevent="createUser">
        <v-text-field
          v-model="newUsername"
          density="comfortable"
          hide-details
          label="Username"
          prepend-inner-icon="mdi-account-plus"
          variant="outlined"
        />

        <v-text-field
          v-model="newPassword"
          autocomplete="new-password"
          density="comfortable"
          hide-details
          label="Password"
          prepend-inner-icon="mdi-lock-plus"
          type="password"
          variant="outlined"
        />

        <v-switch
          v-model="newIsAdmin"
          class="create-admin-switch"
          color="teal"
          density="compact"
          hide-details
          label="Admin"
        />

        <v-btn
          class="action-button primary-action"
          :disabled="!canCreateUser"
          :loading="isSaving"
          prepend-icon="mdi-account-plus"
          type="submit"
          variant="flat"
        >
          Create
        </v-btn>
      </form>

      <div class="user-list" :class="{ 'user-list--loading': isLoading }">
        <p v-if="users.length === 0" class="empty-users">
          No users
        </p>

        <section
          v-for="user in users"
          :key="user.id"
          class="user-row"
        >
          <div class="user-main">
            <div class="user-title">
              <v-icon icon="mdi-account-circle" size="22" />
              <div>
                <strong>{{ user.username }}</strong>
                <span>#{{ user.id }}</span>
              </div>
            </div>

            <div class="user-badges">
              <v-chip
                class="compact-chip"
                :color="user.is_admin ? 'teal' : 'blue-grey'"
                size="small"
                variant="tonal"
              >
                {{ user.is_admin ? 'Admin' : 'User' }}
              </v-chip>
              <v-chip
                class="compact-chip"
                :color="user.is_active ? 'green' : 'deep-orange'"
                size="small"
                variant="tonal"
              >
                {{ user.is_active ? 'Active' : 'Disabled' }}
              </v-chip>
              <v-chip
                class="compact-chip"
                color="indigo"
                size="small"
                variant="tonal"
              >
                {{ user.node_count ?? 0 }} nodes
              </v-chip>
            </div>
          </div>

          <div class="user-controls">
            <v-switch
              :model-value="user.is_admin"
              color="teal"
              density="compact"
              :disabled="isSaving"
              hide-details
              label="Admin"
              @update:model-value="value => emit('updateUser', user.id, { is_admin: Boolean(value) })"
            />

            <v-switch
              :model-value="user.is_active"
              color="green"
              density="compact"
              :disabled="isSaving"
              hide-details
              label="Active"
              @update:model-value="value => emit('updateUser', user.id, { is_active: Boolean(value) })"
            />

            <v-text-field
              v-model="passwordDrafts[user.id]"
              autocomplete="new-password"
              density="compact"
              hide-details
              label="New password"
              type="password"
              variant="outlined"
            />

            <v-tooltip text="Reset password" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  aria-label="Reset password"
                  class="icon-action"
                  :disabled="isSaving || !canResetPassword(user.id)"
                  icon="mdi-lock-reset"
                  variant="flat"
                  @click="resetPassword(user.id)"
                />
              </template>
            </v-tooltip>

            <v-tooltip text="Clear conversations" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  aria-label="Clear conversations"
                  class="icon-action danger-action"
                  :disabled="isSaving || (user.node_count ?? 0) === 0"
                  icon="mdi-trash-can-outline"
                  variant="flat"
                  @click="emit('clearUserNodes', user.id)"
                />
              </template>
            </v-tooltip>
          </div>
        </section>
      </div>
    </v-sheet>
  </v-dialog>
</template>

<script setup lang="ts">
  import { computed, reactive, ref } from 'vue'
  import type { AuthUser, CreateUserPayload, UpdateUserPayload } from '@/types/chat'

  const props = defineProps<{
    errorMessage: string
    isLoading: boolean
    isSaving: boolean
    modelValue: boolean
    users: AuthUser[]
  }>()

  const emit = defineEmits<{
    clearUserNodes: [userId: number]
    createUser: [payload: CreateUserPayload]
    dismissError: []
    refresh: []
    updateUser: [userId: number, payload: UpdateUserPayload]
    'update:modelValue': [value: boolean]
  }>()

  const newUsername = ref('')
  const newPassword = ref('')
  const newIsAdmin = ref(false)
  const passwordDrafts = reactive<Record<number, string>>({})

  const canCreateUser = computed(() =>
    newUsername.value.trim().length > 0 &&
    newPassword.value.length >= 8 &&
    !props.isSaving
  )

  const canResetPassword = (userId: number) =>
    (passwordDrafts[userId] ?? '').length >= 8

  const createUser = () => {
    if (!canCreateUser.value) return

    emit('createUser', {
      username: newUsername.value.trim(),
      password: newPassword.value,
      is_admin: newIsAdmin.value,
    })
    newUsername.value = ''
    newPassword.value = ''
    newIsAdmin.value = false
  }

  const resetPassword = (userId: number) => {
    const password = passwordDrafts[userId] ?? ''
    if (password.length < 8) return

    emit('updateUser', userId, { password })
    passwordDrafts[userId] = ''
  }
</script>

<style scoped>
  .admin-panel {
    --border: rgba(148, 163, 184, 0.24);
    --border-soft: rgba(148, 163, 184, 0.16);
    --button-primary-bg: #2dd4bf;
    --button-primary-hover: #5eead4;
    --button-primary-text: #042f2e;
    --chip-bg: rgba(148, 163, 184, 0.14);
    --chip-text: #f8fafc;
    --danger-bg: rgba(248, 113, 113, 0.14);
    --danger-bg-hover: rgba(248, 113, 113, 0.24);
    --danger-border: rgba(248, 113, 113, 0.34);
    --danger-text: #fecaca;
    --field-bg: #111827;
    --field-bg-focus: #0f172a;
    --icon-button-bg: rgba(148, 163, 184, 0.14);
    --icon-button-hover: rgba(148, 163, 184, 0.24);
    --icon-button-text: #f8fafc;
    --shadow: 0 18px 48px rgba(0, 0, 0, 0.36);
    --surface: #0f172a;
    --surface-raised: #111827;
    --text-muted: #cbd5e1;
    --text-strong: #f8fafc;
    --text-subtle: #94a3b8;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-strong);
    display: grid;
    gap: 16px;
    max-height: min(760px, calc(100vh - 36px));
    overflow: hidden;
    padding: 18px;
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
  :deep(input) {
    color: var(--text-strong);
  }

  :deep(.v-field__outline) {
    color: var(--border);
  }

  :deep(.v-messages),
  :deep(.v-field__prepend-inner) {
    color: var(--text-subtle);
  }

  :deep(.v-selection-control__label),
  :deep(.v-switch__track),
  :deep(.v-switch__thumb) {
    color: var(--text-strong);
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

  .admin-header {
    align-items: center;
    border-bottom: 1px solid var(--border-soft);
    display: flex;
    gap: 14px;
    justify-content: space-between;
    padding-bottom: 14px;
  }

  .admin-tools {
    align-items: center;
    display: flex;
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

  h2 {
    color: var(--text-strong);
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1.15;
    margin: 0;
  }

  .create-user {
    align-items: center;
    display: grid;
    gap: 10px;
    grid-template-columns: minmax(150px, 1fr) minmax(150px, 1fr) auto auto;
  }

  .create-admin-switch {
    min-width: 108px;
  }

  .user-list {
    display: grid;
    gap: 10px;
    min-height: 0;
    overflow-y: auto;
    padding-right: 2px;
    transition: opacity 0.18s ease;
  }

  .user-list--loading {
    opacity: 0.64;
  }

  .empty-users {
    color: var(--text-subtle);
    font-weight: 800;
    margin: 0;
    padding: 18px;
    text-align: center;
  }

  .user-row {
    background: var(--surface-raised);
    border: 1px solid var(--border-soft);
    border-radius: 8px;
    display: grid;
    gap: 12px;
    padding: 12px;
  }

  .user-main {
    align-items: center;
    display: flex;
    gap: 12px;
    justify-content: space-between;
    min-width: 0;
  }

  .user-title {
    align-items: center;
    display: flex;
    gap: 10px;
    min-width: 0;
  }

  .user-title strong {
    color: var(--text-strong);
    display: block;
    font-weight: 900;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .user-title span {
    color: var(--text-subtle);
    font-size: 0.76rem;
    font-weight: 800;
  }

  .user-badges {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .compact-chip {
    background: var(--chip-bg);
    color: var(--chip-text);
    font-weight: 700;
  }

  .user-controls {
    align-items: center;
    display: grid;
    gap: 10px;
    grid-template-columns: auto auto minmax(160px, 1fr) 38px 38px;
  }

  .icon-action {
    background: var(--icon-button-bg);
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
  }

  .action-button {
    border-radius: 8px;
    box-shadow: none;
    font-weight: 800;
    height: 40px;
    letter-spacing: 0;
    text-transform: none;
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

  @media (max-width: 760px) {
    .admin-panel {
      max-height: calc(100vh - 20px);
      padding: 14px;
    }

    .create-user,
    .user-controls {
      grid-template-columns: 1fr;
    }

    .user-main {
      align-items: flex-start;
      flex-direction: column;
    }

    .icon-action {
      width: 100%;
    }
  }
</style>

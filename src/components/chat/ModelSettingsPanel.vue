<template>
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

    <div class="account-panel">
      <div class="account-identity">
        <p class="eyebrow">Signed in</p>
        <strong>{{ currentUsername }}</strong>
      </div>

      <div class="account-actions">
        <v-tooltip v-if="isAdmin" text="Admin" location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              aria-label="Admin"
              class="icon-action"
              icon="mdi-shield-crown-outline"
              variant="flat"
              @click="emit('openAdmin')"
            />
          </template>
        </v-tooltip>

        <v-tooltip text="Sign out" location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              aria-label="Sign out"
              class="icon-action"
              icon="mdi-logout"
              variant="flat"
              @click="emit('logout')"
            />
          </template>
        </v-tooltip>
      </div>
    </div>

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
          @blur="emit('detectModels', true)"
        />

        <v-btn
          class="action-button secondary-action"
          :loading="isDetectingModels"
          prepend-icon="mdi-magnify"
          variant="flat"
          @click="emit('detectModels', false)"
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
</template>

<script setup lang="ts">
  import type { Provider } from '@/types/chat'

  defineProps<{
    currentUsername: string
    defaultOllamaBaseUrl: string
    isAdmin: boolean
    isDetectingModels: boolean
    isReady: boolean
    modelOptions: string[]
    providers: Provider[]
  }>()

  const emit = defineEmits<{
    detectModels: [silent: boolean]
    logout: []
    openAdmin: []
  }>()

  const selectedProvider = defineModel<string>('selectedProvider', { required: true })
  const selectedModel = defineModel<string>('selectedModel', { required: true })
  const ollamaBaseUrl = defineModel<string>('ollamaBaseUrl', { required: true })
  const systemPrompt = defineModel<string>('systemPrompt', { required: true })
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

  .model-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 18px;
  }

  .panel-header {
    align-items: center;
    display: flex;
    gap: 14px;
    justify-content: space-between;
  }

  .eyebrow {
    color: var(--text-muted);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    margin: 0 0 4px;
    text-transform: uppercase;
  }

  h1 {
    color: var(--text-strong);
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1.15;
    margin: 0;
  }

  .compact-chip {
    background: var(--chip-bg);
    color: var(--chip-text);
    flex: 0 0 auto;
    font-weight: 700;
  }

  .control-stack {
    display: grid;
    gap: 12px;
  }

  .account-panel {
    align-items: center;
    background: var(--surface-raised);
    border: 1px solid var(--border-soft);
    border-radius: 8px;
    display: flex;
    gap: 10px;
    justify-content: space-between;
    padding: 12px;
  }

  .account-identity {
    min-width: 0;
  }

  .account-identity strong {
    color: var(--text-strong);
    display: block;
    font-weight: 900;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .account-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    gap: 8px;
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

  .ollama-settings {
    display: grid;
    gap: 10px;
  }

  .action-button {
    border-radius: 8px;
    box-shadow: none;
    font-weight: 800;
    height: 40px;
    letter-spacing: 0;
    text-transform: none;
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

  @media (max-width: 820px) {
    .model-panel {
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 16px;
    }
  }
</style>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <section class="confirm-dialog">
      <header>
        <v-icon icon="mdi-source-merge" size="22" />
        <h2>Merge branches</h2>
      </header>

      <p>
        Combine context from two separate conversation branches. Branch A context will come first, followed by Branch B.
      </p>

      <div class="nodes-info">
        <div class="node-info">Branch A: Node #{{ nodeAId }}</div>
        <div class="node-info">Branch B: Node #{{ nodeBId }}</div>
      </div>

      <v-textarea
        v-model="message"
        placeholder="Ask something that combines both contexts..."
        variant="outlined"
        hide-details
        rows="4"
        class="merge-input"
        bg-color="rgba(15, 23, 42, 0.4)"
      />

      <div class="dialog-actions">
        <v-btn
          class="dialog-button"
          variant="text"
          @click="emit('update:modelValue', false)"
        >
          Cancel
        </v-btn>

        <v-btn
          class="dialog-button primary-button"
          :loading="isMerging"
          :disabled="!message.trim()"
          prepend-icon="mdi-source-merge"
          variant="flat"
          @click="onConfirm"
        >
          Merge & Send
        </v-btn>
      </div>
    </section>
  </v-dialog>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'

  const props = defineProps<{
    isMerging: boolean
    modelValue: boolean
    nodeAId: number | null
    nodeBId: number | null
  }>()

  const emit = defineEmits<{
    confirm: [message: string]
    'update:modelValue': [value: boolean]
  }>()

  const message = ref('')

  watch(() => props.modelValue, (isOpen) => {
    if (isOpen) {
      message.value = ''
    }
  })

  const onConfirm = () => {
    if (message.value.trim()) {
      emit('confirm', message.value)
    }
  }
</script>

<style scoped>
  .confirm-dialog {
    background: var(--surface, #0f172a);
    border: 1px solid var(--border, rgba(148, 163, 184, 0.24));
    border-radius: 8px;
    box-shadow: var(--shadow, 0 18px 48px rgba(0, 0, 0, 0.36));
    color: var(--text-strong, #f8fafc);
    display: grid;
    gap: 16px;
    padding: 20px;
  }

  .confirm-dialog header {
    align-items: center;
    color: var(--primary, #14b8a6);
    display: flex;
    gap: 10px;
  }

  .confirm-dialog p {
    color: var(--text-muted, #cbd5e1);
    line-height: 1.5;
    margin: 0;
  }

  h2 {
    color: var(--text-strong, #f8fafc);
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1.15;
    margin: 0;
  }

  .nodes-info {
    display: flex;
    gap: 16px;
    color: var(--text-subtle, #94a3b8);
    font-size: 0.9rem;
    font-weight: 600;
  }
  
  .node-info {
    background: rgba(148, 163, 184, 0.1);
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid var(--border, rgba(148, 163, 184, 0.24));
  }

  .merge-input :deep(.v-field) {
    border-radius: 8px;
    color: var(--text-strong, #f8fafc);
  }

  .merge-input :deep(.v-field__outline) {
    --v-field-border-opacity: 1;
    color: var(--border, rgba(148, 163, 184, 0.24));
  }

  .merge-input :deep(.v-field--focused .v-field__outline) {
    color: var(--primary, #14b8a6);
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
    color: var(--text-strong, #f8fafc);
  }

  .primary-button {
    background: var(--button-primary-bg, #14b8a6);
    color: #ffffff;
  }

  .primary-button :deep(.v-btn__content),
  .primary-button :deep(.v-icon) {
    color: #ffffff;
  }

  .primary-button:hover {
    background: var(--button-primary-bg-hover, #0d9488);
  }

  .primary-button:disabled {
    opacity: 0.5;
  }
</style>

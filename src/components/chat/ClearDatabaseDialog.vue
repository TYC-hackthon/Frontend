<template>
  <v-dialog
    :model-value="modelValue"
    max-width="420"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <section class="confirm-dialog">
      <header>
        <v-icon icon="mdi-trash-can-outline" size="22" />
        <h2>Clear history</h2>
      </header>

      <p>
        This removes every saved conversation node for your account.
      </p>

      <div class="dialog-actions">
        <v-btn
          class="dialog-button"
          variant="text"
          @click="emit('update:modelValue', false)"
        >
          Cancel
        </v-btn>

        <v-btn
          class="dialog-button danger-button"
          :loading="isClearingDatabase"
          prepend-icon="mdi-trash-can-outline"
          variant="flat"
          @click="emit('confirm')"
        >
          Clear
        </v-btn>
      </div>
    </section>
  </v-dialog>
</template>

<script setup lang="ts">
  defineProps<{
    isClearingDatabase: boolean
    modelValue: boolean
  }>()

  const emit = defineEmits<{
    confirm: []
    'update:modelValue': [value: boolean]
  }>()
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
    color: var(--danger-text, #fecaca);
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
</style>

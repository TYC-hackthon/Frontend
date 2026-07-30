<template>
  <section class="auth-shell">
    <form class="auth-panel" @submit.prevent="submit">
      <header class="auth-header">
        <div>
          <p class="eyebrow">Git-like AI Chat</p>
          <h1>{{ needsSetup ? 'Create administrator' : 'Sign in' }}</h1>
        </div>

        <v-chip
          class="compact-chip"
          :color="needsSetup ? 'amber' : 'teal'"
          :prepend-icon="needsSetup ? 'mdi-shield-key-outline' : 'mdi-login'"
          variant="tonal"
        >
          {{ needsSetup ? 'Setup' : 'Login' }}
        </v-chip>
      </header>

      <v-alert
        v-if="errorMessage"
        density="compact"
        type="error"
        variant="tonal"
      >
        {{ errorMessage }}
      </v-alert>

      <div class="auth-fields">
        <v-text-field
          v-model="username"
          autocomplete="username"
          density="comfortable"
          hide-details
          label="Username"
          prepend-inner-icon="mdi-account"
          variant="outlined"
        />

        <v-text-field
          v-model="password"
          :autocomplete="needsSetup ? 'new-password' : 'current-password'"
          density="comfortable"
          hide-details
          label="Password"
          prepend-inner-icon="mdi-lock"
          type="password"
          variant="outlined"
        />
      </div>

      <v-btn
        class="auth-submit primary-action"
        :disabled="!canSubmit"
        :loading="isSubmitting"
        prepend-icon="mdi-arrow-right"
        type="submit"
        variant="flat"
      >
        {{ needsSetup ? 'Create admin' : 'Sign in' }}
      </v-btn>
    </form>
  </section>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'

  const props = defineProps<{
    errorMessage: string
    isSubmitting: boolean
    needsSetup: boolean
  }>()

  const emit = defineEmits<{
    login: [payload: { username: string; password: string }]
    setup: [payload: { username: string; password: string }]
  }>()

  const username = ref('')
  const password = ref('')

  const canSubmit = computed(() =>
    username.value.trim().length > 0 &&
    password.value.length >= 8 &&
    !props.isSubmitting
  )

  const submit = () => {
    if (!canSubmit.value) return

    const payload = {
      username: username.value.trim(),
      password: password.value,
    }

    if (props.needsSetup) {
      emit('setup', payload)
    } else {
      emit('login', payload)
    }
  }

  watch(() => props.needsSetup, () => {
    password.value = ''
  })
</script>

<style scoped>
  .auth-shell {
    align-items: center;
    display: grid;
    height: 100%;
    justify-items: center;
    min-height: 0;
    padding: 18px;
  }

  .auth-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: var(--shadow);
    color: var(--text-strong);
    display: grid;
    gap: 18px;
    max-width: 460px;
    padding: 22px;
    width: min(100%, 460px);
  }

  .auth-header {
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
    font-size: 1.45rem;
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

  .auth-fields {
    display: grid;
    gap: 12px;
  }

  .auth-submit {
    border-radius: 8px;
    box-shadow: none;
    font-weight: 800;
    height: 44px;
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
</style>

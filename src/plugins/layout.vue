<template>
  <section class="git-ai-layout">
    <header class="git-ai-topbar">
      <a class="layout-brand nodeco" href="/">
        <span class="layout-brand__icon">
          <v-progress-circular
            v-if="loading"
            indeterminate
            size="24"
            width="3"
          />
          <v-icon v-else icon="mdi-source-branch" size="24" />
        </span>
        <span class="layout-brand__copy">
          <span class="layout-brand__eyebrow">Git-like AI</span>
          <span class="layout-brand__title">
            <slot name="title">
              {{ props.title }}
            </slot>
          </span>
        </span>
      </a>

      <nav
        id="layout-top-nav-content"
        aria-label="Workspace controls"
        class="layout-topbar__workspace"
      >
        <slot name="topbar" />
      </nav>

      <div v-if="props.showAccount" class="layout-account">
        <v-hover>
          <template #default="{ isHovering, props: hoverProps }">
            <a
              v-if="!logined"
              class="nodeco"
              href="/login"
            >
              <v-btn
                class="layout-account__button"
                prepend-icon="mdi-login"
                variant="flat"
              >
                登入
              </v-btn>
            </a>
            <v-btn
              v-else
              v-bind="hoverProps"
              class="layout-account__button"
              :prepend-icon="isHovering ? 'mdi-logout' : 'mdi-account-circle'"
              variant="flat"
              @click="account.logout"
            >
              {{ isHovering ? '登出' : username }}
            </v-btn>
          </template>
        </v-hover>
      </div>
    </header>

    <div class="git-ai-body">
      <aside
        id="layout-left-rail-content"
        aria-label="Conversation roots"
        class="git-ai-left-rail"
      >
        <slot name="sidebar" />
      </aside>

      <main class="git-ai-main">
        <v-progress-linear
          bg-color="transparent"
          class="git-ai-progress"
          color="teal"
          height="2"
          :indeterminate="loading"
        />
        <slot />
      </main>
    </div>
  </section>
</template>

<script lang="ts" setup>
  import { inject, type Ref } from 'vue'

  const logined: Ref<boolean> = inject('logined')!
  const account: { [id: string]: Function } = inject('account')!
  const username: Ref<string | null> = inject('username')!
  const loading: Ref<boolean> = inject('loading')!

  const props = withDefaults(defineProps<{
    showAccount?: boolean
    title?: string
  }>(), {
    showAccount: true,
    title: 'Git-like AI Chat',
  })
</script>

<style>
body {
  background-color: #0b1120;
}

.v-card-title {
  font-weight: 900 !important;
}

.nodeco {
  color: inherit;
  text-decoration: none !important;
}
</style>

<style scoped>
  .git-ai-layout {
    --app-bg: #0b1120;
    --app-bg-accent-a: rgba(45, 212, 191, 0.11);
    --app-bg-accent-b: rgba(129, 140, 248, 0.1);
    --assistant-accent: #818cf8;
    --assistant-bubble-bg: #1e293b;
    --assistant-bubble-text: #f8fafc;
    --assistant-node-bg: rgba(129, 140, 248, 0.16);
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
    --danger-bg: rgba(248, 113, 113, 0.14);
    --danger-bg-hover: rgba(248, 113, 113, 0.24);
    --danger-border: rgba(248, 113, 113, 0.34);
    --danger-text: #fecaca;
    --exchange-accent: #f59e0b;
    --exchange-node-bg: rgba(245, 158, 11, 0.14);
    --field-bg: #111827;
    --field-bg-focus: #0f172a;
    --icon-button-bg: rgba(148, 163, 184, 0.14);
    --icon-button-hover: rgba(148, 163, 184, 0.24);
    --icon-button-text: #f8fafc;
    --layout-left-rail-width: 252px;
    --layout-topbar-height: 72px;
    --primary: #14b8a6;
    --primary-node-bg: rgba(20, 184, 166, 0.16);
    --shadow: 0 18px 48px rgba(0, 0, 0, 0.36);
    --surface: #0f172a;
    --surface-raised: #111827;
    --text-muted: #cbd5e1;
    --text-strong: #f8fafc;
    --text-subtle: #94a3b8;
    --user-bubble-bg: #115e59;
    --user-bubble-text: #ecfeff;
    background:
      linear-gradient(135deg, var(--app-bg-accent-a), transparent 30%),
      linear-gradient(315deg, var(--app-bg-accent-b), transparent 34%),
      var(--app-bg);
    color: var(--text-strong);
    color-scheme: dark;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .git-ai-topbar {
    align-items: center;
    background: rgba(15, 23, 42, 0.94);
    border-bottom: 1px solid var(--border);
    display: grid;
    flex: 0 0 var(--layout-topbar-height);
    gap: 10px;
    grid-template-columns: minmax(170px, 196px) minmax(0, 1fr) auto;
    min-height: 0;
    padding: 7px 12px;
    position: relative;
    z-index: 5;
  }

  .layout-brand {
    align-items: center;
    display: flex;
    gap: 10px;
    min-width: 0;
  }

  .layout-brand__icon {
    align-items: center;
    background: rgba(45, 212, 191, 0.14);
    border: 1px solid rgba(45, 212, 191, 0.32);
    border-radius: 8px;
    color: var(--button-secondary-text);
    display: inline-flex;
    flex: 0 0 auto;
    height: 38px;
    justify-content: center;
    width: 38px;
  }

  .layout-brand__copy {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .layout-brand__eyebrow {
    color: var(--text-subtle);
    font-size: 0.72rem;
    font-weight: 900;
    line-height: 1;
    text-transform: uppercase;
  }

  .layout-brand__title {
    color: var(--text-strong);
    font-size: 0.95rem;
    font-weight: 900;
    line-height: 1.15;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .layout-topbar__workspace {
    min-width: 0;
    overflow: visible;
  }

  .layout-account {
    align-items: center;
    display: flex;
    justify-content: flex-end;
    min-width: 0;
  }

  .layout-account__button {
    background: var(--button-secondary-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: none;
    color: var(--button-secondary-text);
    font-weight: 800;
    height: 38px;
    letter-spacing: 0;
    max-width: 168px;
    min-width: 84px;
    overflow: hidden;
    text-transform: none;
  }

  .layout-account__button :deep(.v-btn__content),
  .layout-account__button :deep(.v-icon) {
    color: var(--button-secondary-text);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .git-ai-body {
    display: grid;
    flex: 1;
    grid-template-columns: var(--layout-left-rail-width) minmax(0, 1fr);
    min-height: 0;
    overflow: hidden;
  }

  .git-ai-left-rail {
    background: rgba(15, 23, 42, 0.88);
    border-right: 1px solid var(--border);
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .git-ai-main {
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    position: relative;
  }

  .git-ai-progress {
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
    z-index: 2;
  }

  @media (max-width: 1180px) {
    .git-ai-layout {
      --layout-left-rail-width: 236px;
      --layout-topbar-height: 104px;
    }

    .git-ai-topbar {
      align-items: start;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-rows: auto minmax(0, 1fr);
      padding: 7px 10px;
    }

    .layout-topbar__workspace {
      grid-column: 1 / -1;
      width: 100%;
    }
  }

  @media (max-width: 820px) {
    .git-ai-layout {
      --layout-topbar-height: 104px;
    }

    .layout-topbar__workspace {
      overflow-x: auto;
      overflow-y: visible;
      padding-bottom: 2px;
    }

    .git-ai-body {
      grid-template-columns: 1fr;
      grid-template-rows: minmax(112px, 21%) minmax(0, 1fr);
    }

    .git-ai-left-rail {
      border-bottom: 1px solid var(--border);
      border-right: 0;
    }
  }
</style>

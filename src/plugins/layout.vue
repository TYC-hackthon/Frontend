<template>
  <section class="git-ai-layout">
    <div ref="glowFieldRef" aria-hidden="true" class="layout-glow-field">
      <span class="layout-glow layout-glow--teal" />
      <span class="layout-glow layout-glow--indigo" />
      <span class="layout-glow layout-glow--amber" />
      <span class="layout-scanline" />
      <span class="layout-light-beam layout-light-beam--a" />
      <span class="layout-light-beam layout-light-beam--b" />
      <span class="layout-particle layout-particle--a" />
      <span class="layout-particle layout-particle--b" />
      <span class="layout-particle layout-particle--c" />
      <span class="layout-particle layout-particle--d" />
    </div>

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
  import { animate, stagger } from 'animejs'
  import { inject, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

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

  const glowFieldRef = ref<HTMLElement | null>(null)
  const animations: { cancel: () => unknown }[] = []

  onMounted(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!glowFieldRef.value) return

    const scanline = glowFieldRef.value.querySelector('.layout-scanline')
    const beams = glowFieldRef.value.querySelectorAll('.layout-light-beam')
    const particles = glowFieldRef.value.querySelectorAll('.layout-particle')
    if (!scanline) return

    animations.push(
      animate(glowFieldRef.value.querySelectorAll('.layout-glow'), {
        x: ['-8vw', '8vw'],
        y: ['-6vh', '6vh'],
        scale: [0.86, 1.22],
        opacity: [0.54, 0.94],
        duration: 6800,
        delay: stagger(900),
        ease: 'inOutSine',
        loop: true,
        alternate: true,
      }),
      animate(scanline, {
        translateX: ['-24%', '40%'],
        opacity: [0.22, 0.52],
        duration: 4200,
        ease: 'inOutQuad',
        loop: true,
        alternate: true,
      }),
      animate(beams, {
        translateX: ['-22vw', '18vw'],
        opacity: [0.1, 0.42],
        duration: 6200,
        delay: stagger(1400),
        ease: 'inOutSine',
        loop: true,
        alternate: true,
      }),
      animate(particles, {
        translateX: ['-2vw', '5vw'],
        translateY: ['5vh', '-9vh'],
        scale: [0.7, 1.25],
        opacity: [0.28, 0.9],
        duration: 3600,
        delay: stagger(520),
        ease: 'inOutQuad',
        loop: true,
        alternate: true,
      }),
      animate('.layout-brand__icon', {
        boxShadow: [
          'inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 10px 24px rgba(20, 184, 166, 0.1)',
          'inset 0 1px 0 rgba(255, 255, 255, 0.24), 0 0 42px rgba(45, 212, 191, 0.46)',
        ],
        duration: 1800,
        ease: 'inOutSine',
        loop: true,
        alternate: true,
      }),
    )
  })

  onBeforeUnmount(() => {
    animations.forEach(animation => animation.cancel())
  })
</script>

<style>
body {
  background-color: #070b13;
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
    --app-bg: #070b13;
    --app-bg-accent-a: rgba(20, 184, 166, 0.16);
    --app-bg-accent-b: rgba(99, 102, 241, 0.12);
    --assistant-accent: #818cf8;
    --assistant-bubble-bg: #151d2d;
    --assistant-bubble-text: #f8fafc;
    --assistant-node-bg: rgba(129, 140, 248, 0.16);
    --border: rgba(148, 163, 184, 0.26);
    --border-bright: rgba(226, 232, 240, 0.14);
    --border-soft: rgba(148, 163, 184, 0.14);
    --button-primary-bg: #2dd4bf;
    --button-primary-hover: #5eead4;
    --button-primary-text: #042f2e;
    --button-secondary-bg: rgba(45, 212, 191, 0.12);
    --button-secondary-hover: rgba(45, 212, 191, 0.2);
    --button-secondary-text: #ccfbf1;
    --chip-bg: rgba(148, 163, 184, 0.14);
    --chip-text: #f8fafc;
    --danger-bg: rgba(248, 113, 113, 0.14);
    --danger-bg-hover: rgba(248, 113, 113, 0.24);
    --danger-border: rgba(248, 113, 113, 0.34);
    --danger-text: #fecaca;
    --exchange-accent: #f59e0b;
    --exchange-node-bg: rgba(245, 158, 11, 0.14);
    --field-bg: rgba(15, 23, 42, 0.84);
    --field-bg-focus: rgba(15, 23, 42, 0.96);
    --icon-button-bg: rgba(148, 163, 184, 0.14);
    --icon-button-hover: rgba(148, 163, 184, 0.24);
    --icon-button-text: #f8fafc;
    --layout-left-rail-width: 264px;
    --layout-topbar-height: 76px;
    --primary: #14b8a6;
    --primary-node-bg: rgba(20, 184, 166, 0.16);
    --shadow: 0 22px 70px rgba(0, 0, 0, 0.46);
    --shadow-soft: 0 14px 36px rgba(0, 0, 0, 0.28);
    --surface: rgba(15, 23, 42, 0.9);
    --surface-glass: rgba(15, 23, 42, 0.74);
    --surface-raised: rgba(17, 24, 39, 0.92);
    --surface-sunken: rgba(2, 6, 23, 0.28);
    --text-muted: #cbd5e1;
    --text-strong: #f8fafc;
    --text-subtle: #94a3b8;
    --user-bubble-bg: #0f766e;
    --user-bubble-text: #ecfeff;
    background:
      radial-gradient(circle at 18% 12%, var(--app-bg-accent-a), transparent 32%),
      radial-gradient(circle at 82% 10%, var(--app-bg-accent-b), transparent 34%),
      linear-gradient(180deg, rgba(15, 23, 42, 0.72), transparent 42%),
      var(--app-bg);
    color: var(--text-strong);
    color-scheme: dark;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }

  .layout-glow-field {
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    position: absolute;
    z-index: 2;
  }

  .layout-glow {
    border-radius: 999px;
    filter: blur(38px);
    mix-blend-mode: screen;
    opacity: 0.68;
    position: absolute;
    transform: translate3d(0, 0, 0);
    will-change: opacity, transform;
  }

  .layout-glow--teal {
    background: rgba(45, 212, 191, 0.5);
    height: 40vh;
    left: 1%;
    top: 5%;
    width: 38vw;
  }

  .layout-glow--indigo {
    background: rgba(99, 102, 241, 0.42);
    height: 42vh;
    right: 2%;
    top: 14%;
    width: 34vw;
  }

  .layout-glow--amber {
    background: rgba(245, 158, 11, 0.28);
    bottom: 3%;
    height: 30vh;
    left: 28%;
    width: 32vw;
  }

  .layout-scanline {
    background:
      linear-gradient(90deg, transparent, rgba(45, 212, 191, 0.36), rgba(129, 140, 248, 0.16), transparent),
      linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.08), transparent);
    bottom: -10%;
    filter: blur(2px);
    left: -8%;
    opacity: 0.28;
    position: absolute;
    top: 9%;
    transform: skewX(-18deg);
    width: 34%;
    will-change: opacity, transform;
  }

  .layout-light-beam {
    background: linear-gradient(90deg, transparent, rgba(94, 234, 212, 0.2), transparent);
    filter: blur(3px);
    height: 2px;
    left: 0;
    opacity: 0.24;
    position: absolute;
    transform: rotate(-16deg);
    width: 58vw;
    will-change: opacity, transform;
  }

  .layout-light-beam--a {
    top: 22%;
  }

  .layout-light-beam--b {
    background: linear-gradient(90deg, transparent, rgba(129, 140, 248, 0.22), transparent);
    right: 0;
    top: 68%;
    transform: rotate(12deg);
  }

  .layout-particle {
    background: #99f6e4;
    border-radius: 999px;
    box-shadow: 0 0 18px rgba(45, 212, 191, 0.86);
    height: 5px;
    opacity: 0.46;
    position: absolute;
    width: 5px;
    will-change: opacity, transform;
  }

  .layout-particle--a {
    left: 18%;
    top: 28%;
  }

  .layout-particle--b {
    background: #c7d2fe;
    box-shadow: 0 0 18px rgba(129, 140, 248, 0.82);
    left: 72%;
    top: 22%;
  }

  .layout-particle--c {
    left: 56%;
    top: 74%;
  }

  .layout-particle--d {
    background: #fde68a;
    box-shadow: 0 0 18px rgba(245, 158, 11, 0.72);
    left: 32%;
    top: 58%;
  }

  .git-ai-topbar {
    align-items: center;
    backdrop-filter: blur(18px);
    background: rgba(8, 13, 24, 0.86);
    border-bottom: 1px solid var(--border);
    box-shadow: 0 10px 34px rgba(0, 0, 0, 0.22);
    display: grid;
    flex: 0 0 var(--layout-topbar-height);
    gap: 10px;
    grid-template-columns: minmax(170px, 196px) minmax(0, 1fr) auto;
    min-height: 0;
    padding: 8px 14px;
    position: relative;
    z-index: 5;
  }

  .git-ai-topbar::after {
    background: linear-gradient(90deg, transparent, rgba(45, 212, 191, 0.72), rgba(129, 140, 248, 0.46), transparent);
    bottom: -1px;
    content: "";
    height: 1px;
    left: 0;
    opacity: 0.72;
    position: absolute;
    width: 44%;
  }

  .layout-brand {
    align-items: center;
    display: flex;
    gap: 10px;
    min-width: 0;
  }

  .layout-brand__icon {
    align-items: center;
    background:
      linear-gradient(145deg, rgba(45, 212, 191, 0.24), rgba(99, 102, 241, 0.18));
    border: 1px solid rgba(45, 212, 191, 0.32);
    border-radius: 8px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 10px 24px rgba(20, 184, 166, 0.1);
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

  .layout-brand:hover .layout-brand__icon {
    border-color: rgba(94, 234, 212, 0.58);
    color: #ecfeff;
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
    position: relative;
    z-index: 3;
  }

  .git-ai-left-rail {
    backdrop-filter: blur(14px);
    background:
      linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.74));
    border-right: 1px solid var(--border);
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .git-ai-main {
    background:
      linear-gradient(90deg, rgba(148, 163, 184, 0.05), transparent 22%),
      linear-gradient(180deg, rgba(15, 23, 42, 0.16), rgba(2, 6, 23, 0.1));
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

  @media (prefers-reduced-motion: reduce) {
    .layout-glow,
    .layout-scanline,
    .layout-light-beam,
    .layout-particle {
      transform: none !important;
    }
  }
</style>

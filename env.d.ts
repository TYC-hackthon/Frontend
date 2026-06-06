/// <reference types="vite/client" />
/// <reference types="vite-plugin-vue-layouts-next/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_BASE_URL?: string
  readonly VITE_OLLAMA_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

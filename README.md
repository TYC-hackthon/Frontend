# Git-like AI Chat 前端

這是專案的 Vue 3 前端，使用 Vite、TypeScript 與 Vuetify。目前首頁已改成簡易 LLM 對話工作區，讓使用者可以選擇 Provider、Model、設定 System Prompt，並送出訊息與模型對話。

## 主要架構

- `src/main.ts`：Vue 應用程式入口，掛載插件。
- `src/router/index.ts`：路由設定，目前首頁載入 `src/pages/index.vue`。
- `src/pages/index.vue`：主要聊天頁面，包含模型選擇、訊息列表、輸入框與送出流程。
- `src/plugins/vuetify.ts`：Vuetify 設定。
- `vite.config.mts`：Vite 設定，已加入 `/api` proxy 到後端 `http://localhost:5000`。

## API 串接

前端會呼叫：

- `GET /api/models`：取得可用 Provider 與 Model 清單。
- `POST /api/chat`：送出對話內容。

`POST /api/chat` payload 目前包含：

```json
{
  "provider": "ollama",
  "model": "llama3.1",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ]
}
```

## 開發指令

```bash
npm install
npm run dev
npm run build
```

開發伺服器預設為 `http://127.0.0.1:3000/`。

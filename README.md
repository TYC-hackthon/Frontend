# Git-like AI Chat 前端

這是專案的 Vue 3 前端，使用 Vite、TypeScript 與 Vuetify。目前首頁已改成 Git-like LLM 對話工作區，讓使用者可以選擇 Provider、Model、設定 System Prompt，並透過後端節點 API 維護分支上下文。Model 欄位可手動輸入；若選擇 Ollama，畫面會額外顯示 Ollama Base URL 與模型偵測按鈕。

## 主要架構

- `src/main.ts`：Vue 應用程式入口，掛載插件。
- `src/router/index.ts`：路由設定，目前首頁載入 `src/pages/index.vue`。
- `src/pages/index.vue`：主要聊天頁面，包含模型選擇、訊息列表、節點樹、上下文載入與送出流程。
- `src/plugins/vuetify.ts`：Vuetify 設定。
- `vite.config.mts`：Vite 設定，已加入 `/api` proxy 到後端 `http://localhost:5000`。

## API 串接

前端會呼叫：

- `GET /api/models`：取得可用 Provider 與 Model 清單。
- `GET /api/ollama/models`：依照 Ollama Base URL 偵測本機已拉取的模型。
- `GET /api/tree`：取得所有對話節點、root 節點與 children id。
- `GET /api/context/<node_id>`：取得指定節點往根節點回溯後的線性上下文。
- `POST /api/chat`：送出目前分支下的新訊息。

`POST /api/chat` payload 目前包含：

```json
{
  "provider": "ollama",
  "model": "gemma3:4b",
  "ollama_base_url": "http://localhost:11434",
  "system_prompt": "You are a concise assistant.",
  "parent_id": 12,
  "message": "Continue from this branch."
}
```

`parent_id` 來自目前選取的 `currentNodeId`；若為 `null`，代表從新的 root 對話開始。送出成功後，前端會使用回應中的 `current_node_id` / `currentNodeId` 載入 `/api/context/<node_id>`，以確認畫面內容與後端重組上下文一致。

## 開發指令

```bash
npm install
npm run dev
npm run build
```

可用 `.env` 設定 Ollama Base URL 欄位的預設值與 placeholder：

```bash
VITE_OLLAMA_BASE_URL=http://localhost:11434
```

開發伺服器預設為 `http://127.0.0.1:3000/`。

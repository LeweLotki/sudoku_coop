/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend WebSocket base URL, e.g. `wss://your-app.herokuapp.com/ws`. */
  readonly VITE_BACKEND_WS_URL?: string;
  /** Invite-style access token appended to the WebSocket URL. */
  readonly VITE_ACCESS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

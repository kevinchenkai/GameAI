/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TAVERN_API_URL?: string;
  readonly VITE_ASSET_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

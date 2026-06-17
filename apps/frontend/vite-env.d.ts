/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NAVER_CLIENT_ID?: string;
  readonly VITE_MAPBOX_TOKEN?: string;
  readonly VITE_BUILDING_MODEL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

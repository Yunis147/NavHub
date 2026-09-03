/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ROBOT_HOST?: string;
  readonly VITE_ROSBRIDGE_URL?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** 'true' to echo OTP codes on screen for LOCAL dev only (never in prod). */
  readonly VITE_DEV_OTP_ECHO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

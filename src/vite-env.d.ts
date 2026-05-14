/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API da clínica (auth, pacientes, simulações, proxy enhance) — ex.: http://localhost:3001 */
  readonly VITE_APP_API_URL?: string;
  /** Chave publicável Stripe para checkout embedded (conta parceiro) */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  /** @deprecated Use VITE_APP_API_URL */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

declare const __APP_VERSION__: string

declare namespace CSS {
  namespace paintWorklet {
    export function addModule(url: string): Promise<void>;
  }
}

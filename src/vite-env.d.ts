/// <reference types="vite/client" />

declare module 'mammoth/mammoth.browser.js' {
  const mammoth: {
    extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: unknown[] }>
  }
  export default mammoth
}

declare module 'pdfjs-dist/build/pdf.worker.mjs?url' {
  const url: string
  export default url
}

declare module 'pdfjs-dist/build/pdf.mjs' {
  export const GlobalWorkerOptions: { workerSrc: string }
  export function getDocument(src: unknown): { promise: Promise<any> }
}

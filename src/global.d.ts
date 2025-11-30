declare module '*.module.css';
declare module '*.module.scss';
declare module '*.module.sass';

// Allow importing raw CSS files if needed
declare module '*.css';

declare global {
  interface Window {
    __SOM__?: any;
  }
  // small ambient registry used by tabs/registry.ts
  function register(spec: { id: string; title?: string; group?: string; loader?: () => Promise<any> }): void;
}

export {};

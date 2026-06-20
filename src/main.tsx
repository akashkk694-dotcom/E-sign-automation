import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

// Polyfills for TC39 proposals relied upon by newer versions of pdfjs-dist
if (!(Map.prototype as any).getOrInsertComputed) {
  (Map.prototype as any).getOrInsertComputed = function (key: any, callbackFn: any) {
    if (this.has(key)) {
      return this.get(key);
    }
    const value = callbackFn(key);
    this.set(key, value);
    return value;
  };
}

if (!(WeakMap.prototype as any).getOrInsertComputed) {
  (WeakMap.prototype as any).getOrInsertComputed = function (key: any, callbackFn: any) {
    if (this.has(key)) {
      return this.get(key);
    }
    const value = callbackFn(key);
    this.set(key, value);
    return value;
  };
}

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


/**
 * Chronos Application Entry Point
 * Mounts the Svelte application and initializes global state
 */
/**
 * Application Entry Point: Initializes the Svelte application and mounts it to the DOM.
 */
import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

// ============================================================================
// Environment Validation
// ============================================================================

function validateEnvironment(): void {
  if (typeof window === 'undefined') {
    throw new Error('[Chronos] This application requires a browser environment');
  }

  const requiredFeatures = [
    { name: 'localStorage', check: () => typeof localStorage !== 'undefined' },
    { name: 'Promise', check: () => typeof Promise !== 'undefined' },
    { name: 'fetch', check: () => typeof fetch !== 'undefined' },
  ];

  const missingFeatures = requiredFeatures.filter((f) => !f.check());

  if (missingFeatures.length > 0) {
    console.warn(
      '[Chronos] Missing browser features:',
      missingFeatures.map((f) => f.name).join(', ')
    );
  }
}

// ============================================================================
// Application Mount
// ============================================================================

function initializeApp(): ReturnType<typeof mount> {
  validateEnvironment();

  const targetElement = document.getElementById('app');

  if (!targetElement) {
    throw new Error('[Chronos] Could not find #app element to mount application');
  }

  const app = mount(App, {
    target: targetElement,
  });

  if (import.meta.env.DEV) {
    console.log('[Chronos] Application mounted in development mode');
    console.log('[Chronos] Supabase configured:', Boolean(import.meta.env.VITE_SUPABASE_URL));
  }

  return app;
}

// ============================================================================
// Visibility Change Handler
// ============================================================================

function setupVisibilityHandler(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      window.dispatchEvent(new CustomEvent('chronos:wake'));
    }
  });
}

// ============================================================================
// Error Handling
// ============================================================================

function setupGlobalErrorHandlers(): void {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Chronos] Unhandled Promise rejection:', event.reason);
  });

  window.addEventListener('error', (event) => {
    console.error('[Chronos] Uncaught error:', event.error);
  });
}

// ============================================================================
// Service Worker Registration (for future PWA support)
// ============================================================================

async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('[Chronos] Service worker registered');
    } catch {
      console.log('[Chronos] Service worker registration skipped');
    }
  }
}

// ============================================================================
// Initialize
// ============================================================================

let app;

try {
  setupGlobalErrorHandlers();
  setupVisibilityHandler();
  app = initializeApp();
  registerServiceWorker();
} catch (e) {
  console.error("Critical initialization error", e);
  document.body.innerHTML = `
    <div style="
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #1a1a1a;
      color: #ff5555;
      font-family: system-ui, sans-serif;
      text-align: center;
      padding: 20px;
    ">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Something went wrong</h1>
      <pre style="
        background: #2a2a2a;
        padding: 16px;
        border-radius: 8px;
        text-align: left;
        max-width: 800px;
        overflow: auto;
        color: #e0e0e0;
      ">${e instanceof Error ? e.message + "\n" + e.stack : e}</pre>
      <button onclick="window.location.reload()" style="
        margin-top: 24px;
        padding: 12px 24px;
        background: #333;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
      ">Reload Application</button>
    </div>
  `;
}

export default app;
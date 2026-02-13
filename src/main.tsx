import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ShowcaseProvider } from './contexts/ShowcaseContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { supabase } from './lib/supabase'
import { initializeShowcaseDatabase } from './services/showcaseDatabaseSeeder'

// Expose for console debugging
declare global {
  interface Window {
    supabase: typeof supabase;
    initShowcaseDB: typeof initializeShowcaseDatabase;
  }
}

window.supabase = supabase;
window.initShowcaseDB = initializeShowcaseDatabase;

console.log('[Debug] Supabase and initShowcaseDB exposed to window');
console.log('[Debug] Run "await window.initShowcaseDB()" to manually seed database');

console.log('[MAIN_INIT] Starting React application render...');

const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('[MAIN_INIT] FATAL: Root element #root not found in DOM');
  throw new Error('Root element not found')
}

console.log('[MAIN_INIT] Root element found, creating React root...');

// Show loading indicator immediately while React initializes
rootElement.innerHTML = `
  <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: system-ui, -apple-system, sans-serif;">
    <div style="text-align: center; color: white;">
      <div style="font-size: 48px; margin-bottom: 24px;">🧠</div>
      <div style="font-size: 24px; font-weight: 600; margin-bottom: 12px;">AgeEmpower Showcase</div>
      <div style="font-size: 16px; opacity: 0.9;">Initializing application...</div>
      <div style="margin-top: 20px;">
        <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      </div>
    </div>
    <style>
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </div>
`;

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <ShowcaseProvider>
        <App />
      </ShowcaseProvider>
    </ErrorBoundary>
  </StrictMode>
)

console.log('[MAIN_INIT] React render() called, waiting for first paint...');

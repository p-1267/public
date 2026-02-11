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

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <ShowcaseProvider>
        <App />
      </ShowcaseProvider>
    </ErrorBoundary>
  </StrictMode>
)

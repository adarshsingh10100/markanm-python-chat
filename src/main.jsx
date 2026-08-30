import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Suppress unhandled third-party Chrome extension errors & promise rejections
window.addEventListener('error', (e) => {
  if (e.filename && e.filename.includes('chrome-extension://')) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}, true);

window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && e.reason.stack && e.reason.stack.includes('chrome-extension://')) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}, true);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

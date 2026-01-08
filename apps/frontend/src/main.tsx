import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DebugProvider } from './state/DebugStateProvider.tsx';

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DebugProvider>
      <App />
    </DebugProvider>
  </StrictMode>
);

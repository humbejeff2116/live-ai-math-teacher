import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DebugProvider } from './state/DebugStateProvider.tsx';
import { WebSocketProvider } from './state/WebSocketStateProvider.tsx';
import { ConnectionToast } from './components/ConnectionToast.tsx';

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DebugProvider>
      <WebSocketProvider>
        <ConnectionToast />
        <App />
      </WebSocketProvider>
    </DebugProvider>
  </StrictMode>
);

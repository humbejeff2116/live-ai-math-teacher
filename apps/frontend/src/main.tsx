import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRoutes from "./App.tsx";
import { DebugProvider } from './state/DebugStateProvider.tsx';
import { WebSocketProvider } from './state/WebSocketStateProvider.tsx';
import { BrowserRouter as Router } from "react-router-dom";
// import { HashRouter as Router } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DebugProvider>
      <WebSocketProvider>
        <Router>
          <AppRoutes />
        </Router>
      </WebSocketProvider>
    </DebugProvider>
  </StrictMode>,
);

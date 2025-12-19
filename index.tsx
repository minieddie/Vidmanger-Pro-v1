
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Added (window as any).document casting to handle environments with missing DOM type definitions
const rootElement = (window as any).document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = (ReactDOM as any).createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
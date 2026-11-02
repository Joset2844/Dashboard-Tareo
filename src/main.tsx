import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker with auto-update
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Nueva versión disponible.');
  },
  onOfflineReady() {
    console.log('App lista para operar sin conexión.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);

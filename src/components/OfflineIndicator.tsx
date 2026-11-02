import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-500/15 border-b border-amber-500/30 text-amber-300 px-4 py-2 text-xs flex items-center justify-center gap-2 backdrop-blur-md sticky top-0 z-50 animate-in fade-in duration-300"
    >
      <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
      <span className="font-medium">
        Modo sin conexión activo — Los datos de producción y métricas locales continúan disponibles.
      </span>
    </div>
  );
};

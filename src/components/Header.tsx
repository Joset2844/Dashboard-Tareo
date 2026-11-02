import React, { useState, useEffect } from 'react';
import { 
  Factory, 
  Sun, 
  Moon, 
  Clock, 
  FileSpreadsheet, 
  Settings2, 
  FileCheck, 
  LayoutDashboard, 
  Upload, 
  RefreshCw,
  AlertCircle,
  ArrowLeftRight,
  Activity
} from 'lucide-react';
import { ShiftType } from '../types';
import { getCurrentSystemShift, getNextShiftCountdown, formatShiftLabel } from '../utils/shifts';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: 'dashboard' | 'comparative' | 'events' | 'targets' | 'reports' | 'data';
  onTabChange: (tab: 'dashboard' | 'comparative' | 'events' | 'targets' | 'reports' | 'data') => void;
  onOpenUpload: () => void;
  totalRecordsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenUpload,
  totalRecordsCount,
}) => {
  const [currentShift, setCurrentShift] = useState<ShiftType>(getCurrentSystemShift());
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const [countdown, setCountdown] = useState(getNextShiftCountdown());
  const [showShiftInfo, setShowShiftInfo] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());
      setCurrentShift(getCurrentSystemShift());
      setCountdown(getNextShiftCountdown());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-sm no-print">
      {/* Barra superior con branding e indicador de Turno en vivo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo y título del sistema */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  OEE & Eficiencia Industrial
                </h1>
                <span className="text-[10px] tracking-wider uppercase font-semibold text-blue-300 bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded">
                  Control Máquina/Operador
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gestión de velocidad (und/min) en tiempo neto de producción y auditorías internas
              </p>
            </div>
          </div>

          {/* Indicador en tiempo real del Turno del Sistema */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Reloj y Turno en vivo */}
            <div 
              className="relative flex items-center gap-2.5 px-3 py-1.5 rounded bg-slate-800/90 border border-slate-700 text-xs cursor-pointer hover:bg-slate-800 transition-colors"
              onClick={() => setShowShiftInfo(!showShiftInfo)}
              title="Click para ver detalles del sistema de turnos automáticos"
            >
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-slate-200 font-medium">{currentTime}</span>
              </div>

              <div className="h-4 w-px bg-slate-700" />

              <div className="flex items-center gap-1.5 font-medium">
                {currentShift === 'DIA' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-300">Turno Día (07:00 - 18:59)</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-300" />
                    <span className="text-indigo-300">Turno Noche (19:00 - 06:59)</span>
                  </>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>
                  -{countdown.hoursLeft.toString().padStart(2, '0')}:
                  {countdown.minutesLeft.toString().padStart(2, '0')}:
                  {countdown.secondsLeft.toString().padStart(2, '0')}
                </span>
              </div>

              <AlertCircle className="w-3 h-3 text-slate-400" />

              {/* Tooltip flotante explicativo */}
              {showShiftInfo && (
                <div 
                  className="absolute right-0 top-full mt-2 w-80 p-3 bg-slate-800 border border-slate-700 rounded-md shadow-xl text-xs z-50 text-slate-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="font-semibold text-white mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" /> Sistema Automático de Turnos
                  </p>
                  <ul className="space-y-1.5 text-[11px] text-slate-300 mb-2">
                    <li>• <strong className="text-amber-300">Turno Día:</strong> 07:00 a 18:59</li>
                    <li>• <strong className="text-indigo-300">Turno Noche:</strong> 19:00 a 06:59 (día siguiente)</li>
                    <li>• <strong className="text-blue-300">Fecha Operativa:</strong> Todo registro que inicia entre las 19:00 de hoy y las 06:59 de mañana pertenece al Turno Noche de hoy.</li>
                    <li>• La asignación se realiza siempre según la <code className="text-slate-200">HORAINI</code> del evento.</li>
                  </ul>
                  <div className="text-[11px] font-mono text-blue-300 bg-slate-900/80 p-1.5 rounded">
                    Próximo cambio: {countdown.targetTimeStr}
                  </div>
                </div>
              )}
            </div>

            {/* Acciones rápidas: Instalar App (PWA) y carga de datos */}
            <div className="flex items-center gap-2">
              <PWAInstallButton />
              <button
                type="button"
                onClick={onOpenUpload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar Excel</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Pestañas de navegación */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/80">
        <nav className="flex space-x-1 sm:space-x-2 py-2 overflow-x-auto text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => onTabChange('dashboard')}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard de Eficiencia</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('comparative')}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'comparative'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Análisis Comparativo</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('events')}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'events'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Eventos & Paradas</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('targets')}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'targets'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>Metas por Máquina (und/min)</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('reports')}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Reportes & Auditorías</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('data')}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'data'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Datos Excel ({totalRecordsCount})</span>
          </button>
        </nav>
      </div>
    </header>
  );
};

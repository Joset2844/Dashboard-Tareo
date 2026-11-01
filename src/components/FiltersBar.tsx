import React from 'react';
import { 
  Filter, 
  RotateCcw, 
  Search, 
  Calendar, 
  Sun, 
  Moon, 
  User, 
  Cpu, 
  Activity 
} from 'lucide-react';
import { FilterState, MachineTarget, ProductionRecord } from '../types';

interface FiltersBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  machineTargets: MachineTarget[];
  records: ProductionRecord[];
  currentSystemShift: 'DIA' | 'NOCHE';
  onResetFilters: () => void;
  totalFilteredCount: number;
  totalOriginalCount: number;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  filters,
  onFilterChange,
  machineTargets,
  records,
  currentSystemShift,
  onResetFilters,
  totalFilteredCount,
  totalOriginalCount,
}) => {
  // Lista de máquinas disponibles (de las que existen en las metas/máquinas activas)
  const availableMachines = machineTargets.map(m => m.maqDes).sort();

  // Lista de operadores que tienen registros en máquinas válidas
  const machineSet = new Set(machineTargets.map(m => m.maqDes.trim().toLowerCase()));
  const availableOperators = Array.from(
    new Set(
      records
        .filter(r => machineSet.has((r.MaqDes || '').trim().toLowerCase()))
        .map(r => r.DesOperador)
        .filter(Boolean)
    )
  ).sort();

  const availableProcesses = Array.from(
    new Set(
      records
        .filter(r => machineSet.has((r.MaqDes || '').trim().toLowerCase()))
        .map(r => r.Proceso)
        .filter(Boolean)
    )
  ).sort();

  const hasActiveFilters = 
    filters.turno !== 'TODOS' ||
    filters.maqDes !== 'TODAS' ||
    filters.desOperador !== 'TODOS' ||
    filters.proceso !== 'TODOS' ||
    filters.fechaInicio !== '' ||
    filters.fechaFin !== '' ||
    filters.busqueda !== '';

  const handleShiftSelect = (turno: FilterState['turno']) => {
    onFilterChange({ ...filters, turno });
  };

  const handleDateShortcut = (preset: 'all' | 'today' | 'yesterday') => {
    const today = new Date().toISOString().split('T')[0];
    if (preset === 'all') {
      onFilterChange({ ...filters, fechaInicio: '', fechaFin: '' });
    } else if (preset === 'today') {
      onFilterChange({ ...filters, fechaInicio: today, fechaFin: today });
    } else if (preset === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yesterday = d.toISOString().split('T')[0];
      onFilterChange({ ...filters, fechaInicio: yesterday, fechaFin: yesterday });
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 shadow-xs">
      <div className="max-w-7xl mx-auto space-y-3">
        
        {/* Fila principal: Filtros por Turno, Búsqueda */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          {/* Selector de Turno */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Turno:
            </span>

            <button
              type="button"
              onClick={() => handleShiftSelect('TODOS')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                filters.turno === 'TODOS'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos los turnos
            </button>

            <button
              type="button"
              onClick={() => handleShiftSelect('DIA')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                filters.turno === 'DIA'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
              title="Turno Día: 07:05 a 18:59"
            >
              <Sun className="w-3 h-3 text-amber-500" />
              <span>Día (07:05 - 18:59)</span>
            </button>

            <button
              type="button"
              onClick={() => handleShiftSelect('NOCHE')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                filters.turno === 'NOCHE'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100'
              }`}
              title="Turno Noche: 19:00 a 07:04"
            >
              <Moon className="w-3 h-3 text-indigo-500" />
              <span>Noche (19:00 - 07:04)</span>
            </button>

            <button
              type="button"
              onClick={() => handleShiftSelect('ACTUAL')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                filters.turno === 'ACTUAL'
                  ? 'bg-emerald-700 text-white ring-2 ring-emerald-400'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
              title={`Filtrar por el turno activo en el sistema ahora (${currentSystemShift === 'DIA' ? 'Día' : 'Noche'})`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>En curso: {currentSystemShift === 'DIA' ? 'Día' : 'Noche'}</span>
            </button>
          </div>

          {/* Búsqueda rápida por OP o Descripción */}
          <div className="relative min-w-[240px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar OP (odtcod), Producto u Operador..."
              value={filters.busqueda}
              onChange={(e) => onFilterChange({ ...filters, busqueda: e.target.value })}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

        </div>

        {/* Fila secundaria: Selectores desplegables de Máquina, Operador y Rango de Fechas */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
          
          {/* Filtro Máquina */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2 py-1">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Máquina:</span>
            <select
              value={filters.maqDes}
              onChange={(e) => onFilterChange({ ...filters, maqDes: e.target.value })}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="TODAS">Todas las máquinas ({availableMachines.length})</option>
              {availableMachines.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Filtro Operador */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2 py-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Operador:</span>
            <select
              value={filters.desOperador}
              onChange={(e) => onFilterChange({ ...filters, desOperador: e.target.value })}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Todos los operadores ({availableOperators.length})</option>
              {availableOperators.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>

          {/* Filtro Proceso/Evento */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2 py-1">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Evento:</span>
            <select
              value={filters.proceso}
              onChange={(e) => onFilterChange({ ...filters, proceso: e.target.value })}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="TODOS">Todos los eventos</option>
              {availableProcesses.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Rango de Fechas */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Desde:</span>
            <input
              type="date"
              value={filters.fechaInicio}
              onChange={(e) => onFilterChange({ ...filters, fechaInicio: e.target.value })}
              className="bg-transparent text-slate-700 font-mono text-[11px] focus:outline-none"
            />
            <span className="text-slate-400">Hasta:</span>
            <input
              type="date"
              value={filters.fechaFin}
              onChange={(e) => onFilterChange({ ...filters, fechaFin: e.target.value })}
              className="bg-transparent text-slate-700 font-mono text-[11px] focus:outline-none"
            />
          </div>

          {/* Atajos de fecha */}
          <div className="hidden sm:flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => handleDateShortcut('today')}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => handleDateShortcut('yesterday')}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
            >
              Ayer
            </button>
            <button
              type="button"
              onClick={() => handleDateShortcut('all')}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
            >
              Todo
            </button>
          </div>

          {/* Conteo y Reset de filtros */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">
              <strong>{totalFilteredCount}</strong> / {totalOriginalCount} registros
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition-colors cursor-pointer"
                title="Limpiar todos los filtros"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restablecer</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

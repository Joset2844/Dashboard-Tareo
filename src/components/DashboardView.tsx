import React, { useState } from 'react';
import { 
  Gauge, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Award, 
  Cpu, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  Zap, 
  ChevronRight,
  ShieldCheck,
  Search,
  ArrowLeftRight
} from 'lucide-react';
import { ProductionRecord, MachineTarget, FilterState, ShiftType, SHIFT_BASE_HOURS, SHIFT_BASE_MINUTES, GlobalPlantSettings } from '../types';
import { calculateConsolidatedMetrics } from '../utils/metrics';
import { ComparativeView } from './ComparativeView';

interface DashboardViewProps {
  records: ProductionRecord[];
  machineTargets: MachineTarget[];
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onNavigateToTargets: () => void;
  onNavigateToData?: () => void;
  onSelectMachineFilter: (machineName: string) => void;
  onSelectOperatorFilter: (operatorName: string) => void;
  globalSettings?: GlobalPlantSettings;
  currentSystemShift?: ShiftType;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  records,
  machineTargets,
  filters,
  onNavigateToTargets,
  onNavigateToData,
  onSelectMachineFilter,
  onSelectOperatorFilter,
  globalSettings,
  currentSystemShift = 'DIA',
}) => {
  const [operatorSearch, setOperatorSearch] = useState('');
  const [activeViewMode, setActiveViewMode] = useState<'machines' | 'operators' | 'events' | 'comparative'>('machines');

  const { totals, machineMetrics, operatorMetrics, topEvents } = calculateConsolidatedMetrics(
    records,
    machineTargets,
    undefined,
    filters.maqDes,
    globalSettings
  );

  const filteredOperators = operatorMetrics.filter(op => 
    op.operador.toLowerCase().includes(operatorSearch.toLowerCase())
  );

  // Estado vacío si aún no se ha subido ningún Excel
  if (records.length === 0 && filters.maqDes === 'TODAS' && filters.desOperador === 'TODOS') {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center max-w-xl mx-auto shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto text-blue-600">
          <Gauge className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Dashboard listo para recibir datos de producción
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            El sistema está esperando tu archivo de Excel con los registros de las OPs. Las máquinas se detectarán automáticamente y se calcularán los indicadores de eficiencia en base a 11.25 horas (675 min).
          </p>
        </div>
        {onNavigateToData && (
          <button
            type="button"
            onClick={onNavigateToData}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded shadow-xs cursor-pointer"
          >
            <span>Subir Archivo Excel</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* BANNER INFORMATIVO SOBRE BASE DE CÁLCULO: 11.25 HORAS / 675 MINUTOS */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-slate-300 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-white text-sm">
                Eficiencia Operacional en Tiempo de Producción (und x minuto)
              </span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-1.5 py-0.5 rounded">
                Base Estándar: {SHIFT_BASE_HOURS}h ({SHIFT_BASE_MINUTES} min) por turno
              </span>
              <span className="text-[11px] font-mono text-blue-300 bg-blue-950/70 border border-blue-800 px-1.5 py-0.5 rounded">
                {machineTargets.length} máquinas activas
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Las metas se definen en <strong>und x minuto</strong> y se proyectan a <strong>{SHIFT_BASE_MINUTES} minutos ({SHIFT_BASE_HOURS} horas)</strong> de turno. Solo se computa el tiempo en eventos productivos (<code className="text-slate-200">PliegosParc / minutos de producción</code>). Los registros de máquinas eliminadas no son contabilizados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={() => setActiveViewMode('comparative')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded shadow-2xs cursor-pointer transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Comparar Turnos / Operadores</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToTargets}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline px-2 py-1.5 cursor-pointer"
          >
            <span>Editar metas</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI PRINCIPALES CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI 1: Eficiencia Global de Velocidad vs Metas */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Eficiencia Velocidad</span>
            <Gauge className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
              {totals.eficienciaGlobalVelocidad}%
            </span>
            <span className={`text-xs font-semibold flex items-center ${
              totals.eficienciaGlobalVelocidad >= 95 ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              {totals.eficienciaGlobalVelocidad >= 95 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {totals.eficienciaGlobalVelocidad >= 95 ? 'Objetivo cumplido' : 'Bajo meta'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>Vel. Real Promedio:</span>
            <strong className="text-slate-700 font-mono">{totals.velocidadPromedioReal} und/min</strong>
          </div>
        </div>

        {/* KPI 2: Pliegos Buenos Conformes */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Pliegos Buenos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
              {totals.totalPliegosBuenos.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">pliegos</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>Total Producción:</span>
            <strong className="text-slate-700 font-mono">{totals.totalPliegos.toLocaleString()} pliegos</strong>
          </div>
        </div>

        {/* KPI 3: Calidad & Scrap */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Tasa de Calidad</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
              {totals.tasaCalidadGlobal}%
            </span>
            <span className="text-xs font-semibold text-rose-600 font-mono">
              -{totals.mermaPctGlobal}% scrap
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>Meta Calidad Planta:</span>
            <strong className="text-slate-700 font-mono">{globalSettings?.globalQualityTargetPct ?? 98}%</strong>
          </div>
        </div>

        {/* KPI 4: Disponibilidad (Tiempo Producción vs Paradas) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Disponibilidad</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
              {totals.disponibilidadGlobal}%
            </span>
            <span className="text-xs text-slate-500">
              {Math.round((totals.totalMinutosProduccion / 60) * 10) / 10} hrs prod
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>Tiempo Paradas:</span>
            <strong className="text-amber-700 font-mono">{totals.totalMinutosParadas} min</strong>
          </div>
        </div>

        {/* KPI 5: OEE Consolidado */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-all bg-gradient-to-br from-white to-slate-50">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">OEE Estimado</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
              {totals.oeeGlobal}%
            </span>
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
              totals.oeeGlobal >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {totals.oeeGlobal >= 75 ? 'Excelente' : 'Optimizable'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>Base Turno:</span>
            <span className="text-slate-600 font-mono text-[10px]">
              {SHIFT_BASE_HOURS}h / {SHIFT_BASE_MINUTES} min
            </span>
          </div>
        </div>

      </div>

      {/* TABS DE VISTA SECUNDARIA */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveViewMode('machines')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeViewMode === 'machines'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Eficiencia por Máquina ({machineMetrics.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('operators')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeViewMode === 'operators'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Rendimiento por Operador ({operatorMetrics.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('events')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeViewMode === 'events'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pérdidas y Paradas ({topEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('comparative')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeViewMode === 'comparative'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-blue-700 bg-blue-50/70 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
            <span>Vista Comparativa (OEE Turnos / Grupos)</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 hidden sm:inline">
          Turno filtrado: <strong className="text-slate-700">{filters.turno}</strong> | Máquinas activas: <strong className="text-slate-700">{machineMetrics.length}</strong>
        </span>
      </div>

      {/* VISTA 1: RENDIMIENTO POR MÁQUINA */}
      {activeViewMode === 'machines' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machineMetrics.map((machine) => {
              const isSelected = filters.maqDes.toLowerCase() === machine.maqDes.toLowerCase();
              return (
                <div 
                  key={machine.maqDes}
                  className={`bg-white border rounded-lg p-4 shadow-xs transition-all relative overflow-hidden ${
                    isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    machine.status === 'green' ? 'bg-emerald-500' : machine.status === 'yellow' ? 'bg-amber-500' : 'bg-rose-500'
                  }`} />

                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 truncate max-w-[220px]" title={machine.maqDes}>
                        {machine.maqDes}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-500">
                        Meta turno ({SHIFT_BASE_HOURS}h): <strong>{machine.metaTurnoBase.toLocaleString()} und</strong>
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase font-mono ${
                      machine.status === 'green'
                        ? 'bg-emerald-100 text-emerald-800'
                        : machine.status === 'yellow'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {machine.status === 'green' ? 'Cumple' : machine.status === 'yellow' ? 'Alerta' : 'Bajo Meta'}
                    </span>
                  </div>

                  {/* Comparativa Meta und/min vs Real und/min */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 my-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-600 font-medium">Velocidad en Producción:</span>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {machine.realUndMin} <span className="text-slate-500 font-normal">/ {machine.metaUndMin} und/min</span>
                      </span>
                    </div>

                    {/* Barra de progreso de Eficiencia */}
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          machine.eficienciaVelocidad >= 95 
                            ? 'bg-emerald-500' 
                            : machine.eficienciaVelocidad >= machine.warningThreshold 
                            ? 'bg-amber-500' 
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(machine.eficienciaVelocidad, 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center mt-2 text-[11px]">
                      <span className="text-slate-500">
                        Eficiencia (Alerta &lt;{machine.warningThreshold}%):
                      </span>
                      <strong className={`font-mono ${
                        machine.eficienciaVelocidad >= 95 ? 'text-emerald-700' : machine.eficienciaVelocidad >= machine.warningThreshold ? 'text-amber-700' : 'text-rose-700'
                      }`}>
                        {machine.eficienciaVelocidad}%
                      </strong>
                    </div>
                  </div>

                  {/* Métricas secundarias */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-slate-100 pt-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Calidad</span>
                      <div className="font-mono font-bold text-slate-800">{machine.tasaCalidad}%</div>
                      <div className="text-[10px] text-slate-400 font-mono">Meta: {machine.metaCalidad}%</div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">T. Prod</span>
                      <div className="font-mono font-bold text-slate-800">{machine.minutosProd}m</div>
                      <div className="text-[10px] text-slate-500 font-mono">{machine.minutosParada}m parada</div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">OEE Maq</span>
                      <div className="font-mono font-bold text-slate-800">{machine.oee}%</div>
                      <div className="text-[10px] text-slate-500 font-mono">{machine.recordsCount} eventos</div>
                    </div>
                  </div>

                  {/* Acciones por máquina */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => onSelectMachineFilter(isSelected ? 'TODAS' : machine.maqDes)}
                      className="text-blue-600 hover:text-blue-700 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isSelected ? 'Quitar filtro máquina' : 'Filtrar por esta máquina'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-[11px] text-slate-400 font-mono">
                      {machine.pliegosBuenos.toLocaleString()} u buenas
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA 2: RENDIMIENTO POR OPERADOR */}
      {activeViewMode === 'operators' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Ranking y Eficiencia por Operador
              </h3>
              <p className="text-xs text-slate-500">
                Velocidad promedio alcanzada en minutos netos de producción y control de calidad / mermas
              </p>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar operador..."
                value={operatorSearch}
                onChange={(e) => setOperatorSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Rnk</th>
                  <th className="py-2.5 px-3">Operador</th>
                  <th className="py-2.5 px-3">Máquinas Operadas</th>
                  <th className="py-2.5 px-3 text-right">Velocidad (und/min)</th>
                  <th className="py-2.5 px-3 text-right">Meta Turno (675m)</th>
                  <th className="py-2.5 px-3 text-right">Eficiencia Vel. %</th>
                  <th className="py-2.5 px-3 text-right">Tasa Calidad</th>
                  <th className="py-2.5 px-3 text-right">Merma (Scrap)</th>
                  <th className="py-2.5 px-3 text-right">Tiempo Prod</th>
                  <th className="py-2.5 px-3 text-right">Pliegos Buenos</th>
                  <th className="py-2.5 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOperators.map((op, idx) => {
                  const isFiltered = filters.desOperador.toLowerCase() === op.operador.toLowerCase();
                  return (
                    <tr 
                      key={op.operador}
                      className={`hover:bg-slate-50 transition-colors ${
                        isFiltered ? 'bg-blue-50/70 font-medium' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        {op.operador}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-[220px] truncate" title={op.maquinas.join(', ')}>
                        {op.maquinas.join(', ')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        {op.realUndMin} <span className="text-[10px] font-normal text-slate-500">u/m</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        {op.metaTurnoBaseEstimada.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded ${
                          op.eficienciaVelocidad >= 95 ? 'bg-emerald-100 text-emerald-800' : op.eficienciaVelocidad >= 85 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {op.eficienciaVelocidad}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                        {op.tasaCalidad}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                        {op.pliegosMalos.toLocaleString()} <span className="text-[10px] text-slate-500">({op.tasaMerma}%)</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {op.minutosProd} min
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {op.pliegosBuenos.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectOperatorFilter(isFiltered ? 'TODOS' : op.operador)}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer"
                        >
                          {isFiltered ? 'Quitar filtro' : 'Filtrar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 3: PÉRDIDAS, EVENTOS Y PARADAS */}
      {activeViewMode === 'events' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Distribución del Tiempo por Proceso y Causas de Inactividad
            </h3>
            <p className="text-xs text-slate-500">
              Análisis de minutos productivos vs ajustes, paradas de mantenimiento y tiempos muertos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              {topEvents.map(event => (
                <div key={event.proceso} className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${event.esProduccion ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {event.proceso}
                    </span>
                    <span className="font-mono text-slate-600 font-bold">
                      {event.minutos} min <span className="text-[10px] text-slate-400 font-normal">({event.porcentaje}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${event.esProduccion ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(event.porcentaje, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                    <span>{event.esProduccion ? 'Evento de Producción Activa' : 'Parada / No Productivo'}</span>
                    <span>Ocurrencias: {event.veces} veces</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 text-slate-200 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Resumen de Aprovechamiento del Tiempo
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">Tiempo Total Registrado:</span>
                  <span className="font-mono font-bold text-white">{totals.totalMinutos} min ({Math.round((totals.totalMinutos / 60) * 10) / 10} hrs)</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5 text-emerald-400">
                  <span>Tiempo Neto en Producción:</span>
                  <span className="font-mono font-bold">{totals.totalMinutosProduccion} min ({totals.disponibilidadGlobal}%)</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5 text-amber-400">
                  <span>Tiempo en Paradas y Ajustes:</span>
                  <span className="font-mono font-bold">{totals.totalMinutosParadas} min</span>
                </div>
              </div>

              <div className="bg-slate-800/80 p-3 rounded text-[11px] text-slate-300 space-y-1">
                <p className="font-semibold text-white">Impacto en Turno Estándar (11.25 horas / 675 min):</p>
                <p>
                  Las velocidades en <strong>und/min</strong> se computan de forma justa considerando exclusivamente los minutos de producción real. Al eliminar una máquina de la configuración de metas, sus registros quedan automáticamente excluidos de todas las métricas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 4: COMPARATIVA AVANZADA (TURNOS, FECHAS, OPERADORES, MÁQUINAS) */}
      {activeViewMode === 'comparative' && (
        <ComparativeView
          records={records}
          machineTargets={machineTargets}
          globalSettings={globalSettings}
          currentSystemShift={currentSystemShift}
          onNavigateToTargets={onNavigateToTargets}
          onNavigateToData={onNavigateToData}
        />
      )}

    </div>
  );
};

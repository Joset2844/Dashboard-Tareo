import React, { useState, useMemo } from 'react';
import { 
  ArrowLeftRight, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  Users, 
  Cpu, 
  Clock, 
  ShieldCheck, 
  Gauge, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Search, 
  Check, 
  HelpCircle,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight
} from 'lucide-react';
import { 
  ProductionRecord, 
  MachineTarget, 
  ShiftType, 
  GlobalPlantSettings, 
  SHIFT_BASE_MINUTES, 
  SHIFT_BASE_HOURS 
} from '../types';
import { calculateConsolidatedMetrics } from '../utils/metrics';
import { getShiftFromTime, getOperationalDate } from '../utils/shifts';
import { 
  getAvailableShifts, 
  getPreviousShiftTarget, 
  computeDelta, 
  getUniqueOperators, 
  getMachinesOperatedBy, 
  AvailableShift, 
  subtractDays 
} from '../utils/comparativeUtils';

interface ComparativeViewProps {
  records: ProductionRecord[];
  machineTargets: MachineTarget[];
  globalSettings?: GlobalPlantSettings;
  currentSystemShift: ShiftType;
  onNavigateToTargets?: () => void;
  onNavigateToData?: () => void;
}

type ComparativeMode = 'shifts' | 'dates' | 'operators' | 'operator-machines';

export const ComparativeView: React.FC<ComparativeViewProps> = ({
  records,
  machineTargets,
  globalSettings,
  currentSystemShift,
  onNavigateToTargets,
  onNavigateToData,
}) => {
  const [activeMode, setActiveMode] = useState<ComparativeMode>('shifts');

  // Máquinas activas configuradas
  const activeMachines = useMemo(() => {
    return machineTargets.filter(m => m.active).map(m => m.maqDes);
  }, [machineTargets]);

  // Turnos disponibles en los registros
  const availableShifts = useMemo(() => {
    return getAvailableShifts(records);
  }, [records]);

  // Operadores disponibles
  const availableOperators = useMemo(() => {
    return getUniqueOperators(records);
  }, [records]);

  // --------------------------------------------------------------------------
  // ESTADO MODO 1: TURNO ACTUAL VS ANTERIOR
  // --------------------------------------------------------------------------
  const [shiftMachine, setShiftMachine] = useState<string>('TODAS');
  const [selectedShiftKey, setSelectedShiftKey] = useState<string>(() => {
    return availableShifts[0]?.key || '';
  });
  const [customPrevShiftKey, setCustomPrevShiftKey] = useState<string>('auto');

  // Encontrar turno actual seleccionado
  const currentShiftObj = useMemo(() => {
    return availableShifts.find(s => s.key === selectedShiftKey) || availableShifts[0] || null;
  }, [availableShifts, selectedShiftKey]);

  // Encontrar turno anterior (automático o personalizado)
  const previousShiftObj = useMemo(() => {
    if (!currentShiftObj) return null;
    if (customPrevShiftKey !== 'auto') {
      return availableShifts.find(s => s.key === customPrevShiftKey) || null;
    }
    // Buscar turno cronológicamente anterior calculado
    const target = getPreviousShiftTarget(currentShiftObj.fechaTurno, currentShiftObj.turno);
    const calculatedKey = `${target.fechaTurno}_${target.turno}`;
    const exactMatch = availableShifts.find(s => s.key === calculatedKey);
    if (exactMatch) return exactMatch;

    // Si no tiene registros exactos, tomar el siguiente turno en la lista cronológica
    const curIdx = availableShifts.findIndex(s => s.key === currentShiftObj.key);
    if (curIdx >= 0 && curIdx + 1 < availableShifts.length) {
      return availableShifts[curIdx + 1];
    }
    return null;
  }, [currentShiftObj, customPrevShiftKey, availableShifts]);

  // Registros del Turno Actual
  const recordsCurrentShift = useMemo(() => {
    if (!currentShiftObj) return [];
    return records.filter(r => {
      const shift = r.turno || getShiftFromTime(r.HORAINI);
      const opDate = r.fechaTurno || getOperationalDate(r.FECHAINI, r.HORAINI);
      if (shift !== currentShiftObj.turno || opDate !== currentShiftObj.fechaTurno) return false;
      if (shiftMachine !== 'TODAS' && (r.MaqDes || '').trim().toLowerCase() !== shiftMachine.trim().toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [records, currentShiftObj, shiftMachine]);

  // Registros del Turno Anterior
  const recordsPrevShift = useMemo(() => {
    if (!previousShiftObj) return [];
    return records.filter(r => {
      const shift = r.turno || getShiftFromTime(r.HORAINI);
      const opDate = r.fechaTurno || getOperationalDate(r.FECHAINI, r.HORAINI);
      if (shift !== previousShiftObj.turno || opDate !== previousShiftObj.fechaTurno) return false;
      if (shiftMachine !== 'TODAS' && (r.MaqDes || '').trim().toLowerCase() !== shiftMachine.trim().toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [records, previousShiftObj, shiftMachine]);

  // Métricas del Turno Actual vs Anterior
  const metricsCurrentShift = useMemo(() => {
    return calculateConsolidatedMetrics(
      recordsCurrentShift,
      machineTargets,
      undefined,
      shiftMachine !== 'TODAS' ? shiftMachine : undefined,
      globalSettings
    );
  }, [recordsCurrentShift, machineTargets, shiftMachine, globalSettings]);

  const metricsPrevShift = useMemo(() => {
    return calculateConsolidatedMetrics(
      recordsPrevShift,
      machineTargets,
      undefined,
      shiftMachine !== 'TODAS' ? shiftMachine : undefined,
      globalSettings
    );
  }, [recordsPrevShift, machineTargets, shiftMachine, globalSettings]);

  // Deltas Turno Actual vs Anterior
  const oeeDelta = computeDelta(metricsCurrentShift.totals.oeeGlobal, metricsPrevShift.totals.oeeGlobal);
  const velDelta = computeDelta(metricsCurrentShift.totals.eficienciaGlobalVelocidad, metricsPrevShift.totals.eficienciaGlobalVelocidad);
  const dispDelta = computeDelta(metricsCurrentShift.totals.disponibilidadGlobal, metricsPrevShift.totals.disponibilidadGlobal);
  const calDelta = computeDelta(metricsCurrentShift.totals.tasaCalidadGlobal, metricsPrevShift.totals.tasaCalidadGlobal);
  const scrapDelta = computeDelta(metricsCurrentShift.totals.mermaPctGlobal, metricsPrevShift.totals.mermaPctGlobal, true);
  const speedRealDelta = computeDelta(metricsCurrentShift.totals.velocidadPromedioReal, metricsPrevShift.totals.velocidadPromedioReal);

  // --------------------------------------------------------------------------
  // ESTADO MODO 2: COMPARATIVA RANGO DE FECHAS (Periodo A vs Periodo B)
  // --------------------------------------------------------------------------
  const [datePeriodMachine, setDatePeriodMachine] = useState<string>('TODAS');
  const [periodAStart, setPeriodAStart] = useState<string>(() => {
    return availableShifts[0]?.fechaTurno || new Date().toISOString().split('T')[0];
  });
  const [periodAEnd, setPeriodAEnd] = useState<string>(() => {
    return availableShifts[0]?.fechaTurno || new Date().toISOString().split('T')[0];
  });
  const [periodBStart, setPeriodBStart] = useState<string>(() => {
    const base = availableShifts[0]?.fechaTurno || new Date().toISOString().split('T')[0];
    return subtractDays(base, 1);
  });
  const [periodBEnd, setPeriodBEnd] = useState<string>(() => {
    const base = availableShifts[0]?.fechaTurno || new Date().toISOString().split('T')[0];
    return subtractDays(base, 1);
  });

  const recordsPeriodA = useMemo(() => {
    return records.filter(r => {
      const opDate = r.fechaTurno || getOperationalDate(r.FECHAINI, r.HORAINI);
      if (periodAStart && opDate < periodAStart) return false;
      if (periodAEnd && opDate > periodAEnd) return false;
      if (datePeriodMachine !== 'TODAS' && (r.MaqDes || '').trim().toLowerCase() !== datePeriodMachine.trim().toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [records, periodAStart, periodAEnd, datePeriodMachine]);

  const recordsPeriodB = useMemo(() => {
    return records.filter(r => {
      const opDate = r.fechaTurno || getOperationalDate(r.FECHAINI, r.HORAINI);
      if (periodBStart && opDate < periodBStart) return false;
      if (periodBEnd && opDate > periodBEnd) return false;
      if (datePeriodMachine !== 'TODAS' && (r.MaqDes || '').trim().toLowerCase() !== datePeriodMachine.trim().toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [records, periodBStart, periodBEnd, datePeriodMachine]);

  const metricsPeriodA = useMemo(() => {
    return calculateConsolidatedMetrics(
      recordsPeriodA,
      machineTargets,
      undefined,
      datePeriodMachine !== 'TODAS' ? datePeriodMachine : undefined,
      globalSettings
    );
  }, [recordsPeriodA, machineTargets, datePeriodMachine, globalSettings]);

  const metricsPeriodB = useMemo(() => {
    return calculateConsolidatedMetrics(
      recordsPeriodB,
      machineTargets,
      undefined,
      datePeriodMachine !== 'TODAS' ? datePeriodMachine : undefined,
      globalSettings
    );
  }, [recordsPeriodB, machineTargets, datePeriodMachine, globalSettings]);

  // --------------------------------------------------------------------------
  // ESTADO MODO 3: COMPARACIÓN POR GRUPO DE OPERADORES
  // --------------------------------------------------------------------------
  const [selectedOperators, setSelectedOperators] = useState<string[]>(() => {
    return availableOperators.slice(0, 3);
  });
  const [opGroupMachine, setOpGroupMachine] = useState<string>('TODAS');
  const [opSearchTerm, setOpSearchTerm] = useState('');

  const toggleOperator = (op: string) => {
    if (selectedOperators.includes(op)) {
      if (selectedOperators.length > 1) {
        setSelectedOperators(selectedOperators.filter(o => o !== op));
      }
    } else {
      setSelectedOperators([...selectedOperators, op]);
    }
  };

  const selectAllOperators = () => setSelectedOperators([...availableOperators]);
  const clearOperators = () => {
    if (availableOperators.length > 0) {
      setSelectedOperators([availableOperators[0]]);
    }
  };

  // Registros del grupo de operadores
  const recordsOperatorGroup = useMemo(() => {
    const setOps = new Set(selectedOperators.map(o => o.toLowerCase()));
    return records.filter(r => {
      const op = (r.DesOperador || '').trim().toLowerCase();
      if (!setOps.has(op)) return false;
      if (opGroupMachine !== 'TODAS' && (r.MaqDes || '').trim().toLowerCase() !== opGroupMachine.trim().toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [records, selectedOperators, opGroupMachine]);

  const metricsOperatorGroup = useMemo(() => {
    return calculateConsolidatedMetrics(
      recordsOperatorGroup,
      machineTargets,
      undefined,
      opGroupMachine !== 'TODAS' ? opGroupMachine : undefined,
      globalSettings
    );
  }, [recordsOperatorGroup, machineTargets, opGroupMachine, globalSettings]);

  // --------------------------------------------------------------------------
  // ESTADO MODO 4: GRUPO DE MÁQUINAS DE UN OPERADOR ESPECÍFICO
  // --------------------------------------------------------------------------
  const [targetOperatorForMachines, setTargetOperatorForMachines] = useState<string>(() => {
    return availableOperators[0] || '';
  });

  const machinesForSelectedOp = useMemo(() => {
    if (!targetOperatorForMachines) return [];
    return getMachinesOperatedBy(records, targetOperatorForMachines);
  }, [records, targetOperatorForMachines]);

  // Registros de ese operador específico
  const recordsSingleOp = useMemo(() => {
    if (!targetOperatorForMachines) return [];
    return records.filter(r => {
      return (r.DesOperador || '').trim().toLowerCase() === targetOperatorForMachines.trim().toLowerCase();
    });
  }, [records, targetOperatorForMachines]);

  const metricsSingleOp = useMemo(() => {
    return calculateConsolidatedMetrics(
      recordsSingleOp,
      machineTargets,
      undefined,
      undefined,
      globalSettings
    );
  }, [recordsSingleOp, machineTargets, globalSettings]);

  // Render si no hay datos
  if (records.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-10 text-center max-w-lg mx-auto shadow-xs space-y-3">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <ArrowLeftRight className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Vista Comparativa</h3>
        <p className="text-xs text-slate-500">
          Carga un archivo Excel para habilitar el análisis comparativo de OEE entre turnos consecutivos, rangos de fechas, grupos de operadores y máquinas.
        </p>
        {onNavigateToData && (
          <button
            type="button"
            onClick={onNavigateToData}
            className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded cursor-pointer"
          >
            <span>Ir a Cargar Excel</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER COMPARATIVO & SELECTOR DE MODO */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-blue-600/30 text-blue-400 border border-blue-500/30">
              <ArrowLeftRight className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold">Módulo de Análisis Comparativo</h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Base Turno: {SHIFT_BASE_HOURS}h ({SHIFT_BASE_MINUTES} min)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Compara el OEE, velocidad (und/min), calidad y disponibilidad entre turnos consecutivos, periodos de fechas o rendimiento cruzado entre operadores y máquinas.
          </p>
        </div>

        {/* MODALIDAD TABS */}
        <div className="inline-flex p-1 bg-slate-950/80 rounded-lg border border-slate-800 self-start lg:self-center">
          <button
            type="button"
            onClick={() => setActiveMode('shifts')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeMode === 'shifts'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Turno Actual vs Anterior</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('dates')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeMode === 'dates'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Rango de Fechas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('operators')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeMode === 'operators'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Grupo de Operadores</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('operator-machines')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              activeMode === 'operator-machines'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Máquinas de un Operador</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODO 1: TURNO ACTUAL VS TURNO ANTERIOR (MISMA MÁQUINA O TODAS)
      ========================================================================= */}
      {activeMode === 'shifts' && (
        <div className="space-y-5">
          {/* BARRA DE CONFIGURACIÓN DEL COMPARADOR DE TURNOS */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Selector de Máquina */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs">
                  <Cpu className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-semibold text-slate-600">Máquina:</span>
                  <select
                    value={shiftMachine}
                    onChange={(e) => setShiftMachine(e.target.value)}
                    className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer max-w-[200px]"
                  >
                    <option value="TODAS">Todas las máquinas activas</option>
                    {activeMachines.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Selector de Turno de Referencia (Actual) */}
                <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-200 rounded px-2.5 py-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-semibold text-blue-900">Turno Referencia (A):</span>
                  <select
                    value={selectedShiftKey}
                    onChange={(e) => setSelectedShiftKey(e.target.value)}
                    className="bg-transparent font-medium text-blue-950 focus:outline-none cursor-pointer"
                  >
                    {availableShifts.map(s => (
                      <option key={s.key} value={s.key}>
                        {s.label} ({s.recordsCount} ops)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector de Turno de Comparación (Anterior) */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-semibold text-slate-600">Turno Comparado (B):</span>
                  <select
                    value={customPrevShiftKey}
                    onChange={(e) => setCustomPrevShiftKey(e.target.value)}
                    className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="auto">
                      Auto: Inmediatamente Anterior ({previousShiftObj?.label || 'No detectado'})
                    </option>
                    {availableShifts.filter(s => s.key !== selectedShiftKey).map(s => (
                      <option key={s.key} value={s.key}>
                        {s.label} ({s.recordsCount} ops)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Badges de Turnos Identificados */}
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  <strong>A:</strong> {currentShiftObj ? currentShiftObj.label : 'Sin turno'}
                </span>
                <span className="text-slate-400">vs</span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                  <strong>B:</strong> {previousShiftObj ? previousShiftObj.label : 'Sin turno previo'}
                </span>
              </div>
            </div>
          </div>

          {/* TARJETAS PRINCIPALES DE COMPARACIÓN: OEE Y FACTORES */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* CARD OEE PRINCIPAL */}
            <div className="md:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-lg p-5 shadow-sm border border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 text-slate-400">
                  <span className="text-xs uppercase tracking-wider font-semibold">OEE Promedio</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                
                {/* Valores lado a lado */}
                <div className="flex items-baseline justify-between mb-2">
                  <div>
                    <span className="text-xs text-blue-300 block font-medium">Turno Actual</span>
                    <span className="text-3xl font-mono font-bold tracking-tight text-white">
                      {metricsCurrentShift.totals.oeeGlobal}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">Turno Anterior</span>
                    <span className="text-2xl font-mono font-bold tracking-tight text-slate-300">
                      {metricsPrevShift.totals.oeeGlobal}%
                    </span>
                  </div>
                </div>

                {/* Variación Delta */}
                <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Diferencia Neta:</span>
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono ${
                    oeeDelta.trend === 'better'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : oeeDelta.trend === 'worse'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {oeeDelta.diff > 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : oeeDelta.diff < 0 ? (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                    <span>{oeeDelta.diff > 0 ? `+${oeeDelta.diff}%` : `${oeeDelta.diff}%`}</span>
                    <span className="text-[10px] opacity-80">({oeeDelta.pctChange > 0 ? `+${oeeDelta.pctChange}%` : `${oeeDelta.pctChange}%`})</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-[11px] text-slate-400">
                {shiftMachine !== 'TODAS' ? `Máquina evaluada: ${shiftMachine}` : 'Consolidado de todas las máquinas'}
              </div>
            </div>

            {/* CARD 2: DISPONIBILIDAD */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Disponibilidad</span>
                  <Clock className="w-4 h-4 text-indigo-600" />
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-500">Actual:</span>
                    <p className="text-2xl font-bold font-mono text-slate-900">
                      {metricsCurrentShift.totals.disponibilidadGlobal}%
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Anterior:</span>
                    <p className="text-xl font-bold font-mono text-slate-500">
                      {metricsPrevShift.totals.disponibilidadGlobal}%
                    </p>
                  </div>
                </div>

                {/* Barra de progreso comparativa */}
                <div className="space-y-1.5 mt-3">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                      <span>Actual ({metricsCurrentShift.totals.totalMinutosProduccion} min prod)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all" 
                        style={{ width: `${Math.min(metricsCurrentShift.totals.disponibilidadGlobal, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>Anterior ({metricsPrevShift.totals.totalMinutosProduccion} min prod)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-slate-400 h-full rounded-full transition-all" 
                        style={{ width: `${Math.min(metricsPrevShift.totals.disponibilidadGlobal, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Variación:</span>
                <span className={`font-mono font-bold ${
                  dispDelta.trend === 'better' ? 'text-emerald-600' : dispDelta.trend === 'worse' ? 'text-rose-600' : 'text-slate-600'
                }`}>
                  {dispDelta.diff > 0 ? `+${dispDelta.diff}%` : `${dispDelta.diff}%`}
                </span>
              </div>
            </div>

            {/* CARD 3: RENDIMIENTO / VELOCIDAD */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Eficiencia Velocidad</span>
                  <Gauge className="w-4 h-4 text-blue-600" />
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-500">Actual:</span>
                    <p className="text-2xl font-bold font-mono text-slate-900">
                      {metricsCurrentShift.totals.eficienciaGlobalVelocidad}%
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Anterior:</span>
                    <p className="text-xl font-bold font-mono text-slate-500">
                      {metricsPrevShift.totals.eficienciaGlobalVelocidad}%
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 mt-3">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                      <span>Vel. Real: {metricsCurrentShift.totals.velocidadPromedioReal} und/min</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all" 
                        style={{ width: `${Math.min(metricsCurrentShift.totals.eficienciaGlobalVelocidad, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>Vel. Anterior: {metricsPrevShift.totals.velocidadPromedioReal} und/min</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-slate-400 h-full rounded-full transition-all" 
                        style={{ width: `${Math.min(metricsPrevShift.totals.eficienciaGlobalVelocidad, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Variación:</span>
                <span className={`font-mono font-bold ${
                  velDelta.trend === 'better' ? 'text-emerald-600' : velDelta.trend === 'worse' ? 'text-rose-600' : 'text-slate-600'
                }`}>
                  {velDelta.diff > 0 ? `+${velDelta.diff}%` : `${velDelta.diff}%`} ({speedRealDelta.diff > 0 ? `+${speedRealDelta.diff}` : speedRealDelta.diff} u/m)
                </span>
              </div>
            </div>

            {/* CARD 4: CALIDAD & SCRAP */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Tasa Calidad</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-500">Actual:</span>
                    <p className="text-2xl font-bold font-mono text-slate-900">
                      {metricsCurrentShift.totals.tasaCalidadGlobal}%
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Anterior:</span>
                    <p className="text-xl font-bold font-mono text-slate-500">
                      {metricsPrevShift.totals.tasaCalidadGlobal}%
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Pliegos Buenos:</span>
                    <strong className="font-mono">{metricsCurrentShift.totals.totalPliegosBuenos.toLocaleString()} vs {metricsPrevShift.totals.totalPliegosBuenos.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Scrap (Malos):</span>
                    <strong className="font-mono">{metricsCurrentShift.totals.totalPliegosMalos.toLocaleString()} vs {metricsPrevShift.totals.totalPliegosMalos.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Merma %:</span>
                <span className={`font-mono font-bold ${
                  scrapDelta.trend === 'better' ? 'text-emerald-600' : scrapDelta.trend === 'worse' ? 'text-rose-600' : 'text-slate-600'
                }`}>
                  {metricsCurrentShift.totals.mermaPctGlobal}% vs {metricsPrevShift.totals.mermaPctGlobal}%
                </span>
              </div>
            </div>

          </div>

          {/* TABLA COMPARATIVA POR MÁQUINA DE AMBOS TURNOS */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Desglose Comparativo por Máquina ({currentShiftObj?.label} vs {previousShiftObj?.label})
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                {metricsCurrentShift.machineMetrics.length} máquinas en turno actual
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Máquina</th>
                    <th className="py-2.5 px-3 text-right">Meta (u/m)</th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/60 text-blue-900">Vel. Actual</th>
                    <th className="py-2.5 px-3 text-right text-slate-500">Vel. Anterior</th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/60 text-blue-900">OEE Actual</th>
                    <th className="py-2.5 px-3 text-right text-slate-500">OEE Anterior</th>
                    <th className="py-2.5 px-3 text-center">Δ OEE</th>
                    <th className="py-2.5 px-3 text-right">U. Buenas (Act/Ant)</th>
                    <th className="py-2.5 px-3 text-right">Calidad (Act/Ant)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {metricsCurrentShift.machineMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        No hay registros para la máquina seleccionada en el turno de referencia.
                      </td>
                    </tr>
                  ) : (
                    metricsCurrentShift.machineMetrics.map(curM => {
                      const prevM = metricsPrevShift.machineMetrics.find(
                        p => p.maqDes.toLowerCase() === curM.maqDes.toLowerCase()
                      );
                      const mOeeDelta = computeDelta(curM.oee, prevM?.oee || 0);

                      return (
                        <tr key={curM.maqDes} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {curM.maqDes}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            {curM.metaUndMin}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold bg-blue-50/40 text-blue-950">
                            {curM.realUndMin} u/m
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                            {prevM ? `${prevM.realUndMin} u/m` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold bg-blue-50/40 text-blue-950">
                            {curM.oee}%
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                            {prevM ? `${prevM.oee}%` : '-'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {prevM ? (
                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                                mOeeDelta.trend === 'better'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : mOeeDelta.trend === 'worse'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {mOeeDelta.diff > 0 ? `+${mOeeDelta.diff}%` : `${mOeeDelta.diff}%`}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {curM.pliegosBuenos.toLocaleString()} / {prevM ? prevM.pliegosBuenos.toLocaleString() : '0'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            <span className={curM.tasaCalidad >= (globalSettings?.globalQualityTargetPct ?? 98) ? 'text-emerald-700 font-bold' : 'text-amber-700'}>
                              {curM.tasaCalidad}%
                            </span>
                            <span className="text-slate-400 text-[10px]"> / {prevM ? `${prevM.tasaCalidad}%` : '-'}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODO 2: COMPARATIVA EN RANGO DE FECHAS (PERIODO A VS PERIODO B)
      ========================================================================= */}
      {activeMode === 'dates' && (
        <div className="space-y-5">
          {/* BARRA DE FILTRO DE PERIODOS */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Filtro Máquina */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Máquina Objetivo:</label>
                <select
                  value={datePeriodMachine}
                  onChange={(e) => setDatePeriodMachine(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="TODAS">Todas las máquinas activas</option>
                  {activeMachines.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Periodo A */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-md p-2.5">
                <span className="text-xs font-bold text-blue-900 block mb-1">Periodo A (Referencia):</span>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={periodAStart}
                    onChange={(e) => setPeriodAStart(e.target.value)}
                    className="bg-white border border-blue-300 rounded px-2 py-1 text-xs text-slate-800 font-mono"
                  />
                  <span className="text-xs text-slate-400">al</span>
                  <input
                    type="date"
                    value={periodAEnd}
                    onChange={(e) => setPeriodAEnd(e.target.value)}
                    className="bg-white border border-blue-300 rounded px-2 py-1 text-xs text-slate-800 font-mono"
                  />
                </div>
                <span className="text-[10px] text-blue-700 mt-1 block">
                  {recordsPeriodA.length} registros encontrados
                </span>
              </div>

              {/* Periodo B */}
              <div className="bg-slate-50 border border-slate-300 rounded-md p-2.5">
                <span className="text-xs font-bold text-slate-700 block mb-1">Periodo B (Comparación):</span>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={periodBStart}
                    onChange={(e) => setPeriodBStart(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-mono"
                  />
                  <span className="text-xs text-slate-400">al</span>
                  <input
                    type="date"
                    value={periodBEnd}
                    onChange={(e) => setPeriodBEnd(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {recordsPeriodB.length} registros encontrados
                </span>
              </div>

            </div>
          </div>

          {/* TARJETAS RESUMEN DE AMBOS PERIODOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Tarjeta Periodo A */}
            <div className="bg-white border-2 border-blue-300 rounded-lg p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                <span className="text-xs font-bold text-blue-900 uppercase">Periodo A: {periodAStart} al {periodAEnd}</span>
                <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  OEE {metricsPeriodA.totals.oeeGlobal}%
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Eficiencia Vel:</span>
                  <strong className="font-mono text-slate-800">{metricsPeriodA.totals.eficienciaGlobalVelocidad}%</strong>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Calidad:</span>
                  <strong className="font-mono text-slate-800">{metricsPeriodA.totals.tasaCalidadGlobal}%</strong>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Pliegos Buenos:</span>
                  <strong className="font-mono text-slate-800">{metricsPeriodA.totals.totalPliegosBuenos.toLocaleString()}</strong>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Horas Prod:</span>
                  <strong className="font-mono text-slate-800">
                    {Math.round((metricsPeriodA.totals.totalMinutosProduccion / 60) * 10) / 10} h
                  </strong>
                </div>
              </div>
            </div>

            {/* Tarjeta Periodo B */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase">Periodo B: {periodBStart} al {periodBEnd}</span>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  OEE {metricsPeriodB.totals.oeeGlobal}%
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Eficiencia Vel:</span>
                  <strong className="font-mono text-slate-800">{metricsPeriodB.totals.eficienciaGlobalVelocidad}%</strong>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Calidad:</span>
                  <strong className="font-mono text-slate-800">{metricsPeriodB.totals.tasaCalidadGlobal}%</strong>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Pliegos Buenos:</span>
                  <strong className="font-mono text-slate-800">{metricsPeriodB.totals.totalPliegosBuenos.toLocaleString()}</strong>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Horas Prod:</span>
                  <strong className="font-mono text-slate-800">
                    {Math.round((metricsPeriodB.totals.totalMinutosProduccion / 60) * 10) / 10} h
                  </strong>
                </div>
              </div>
            </div>

          </div>

          {/* TABLA COMPARATIVA CON DELTAS */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-900 uppercase">
              Comparativa de Indicadores de Producción (Periodo A vs Periodo B)
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Indicador</th>
                  <th className="py-2.5 px-3 text-right bg-blue-50/50 text-blue-900">Periodo A</th>
                  <th className="py-2.5 px-3 text-right text-slate-600">Periodo B</th>
                  <th className="py-2.5 px-3 text-center">Variación Neta</th>
                  <th className="py-2.5 px-3 text-center">Tendencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {[
                  { label: 'OEE Global Estimado', valA: metricsPeriodA.totals.oeeGlobal, valB: metricsPeriodB.totals.oeeGlobal, suffix: '%', isInv: false },
                  { label: 'Eficiencia de Velocidad vs Metas', valA: metricsPeriodA.totals.eficienciaGlobalVelocidad, valB: metricsPeriodB.totals.eficienciaGlobalVelocidad, suffix: '%', isInv: false },
                  { label: 'Velocidad Media Real', valA: metricsPeriodA.totals.velocidadPromedioReal, valB: metricsPeriodB.totals.velocidadPromedioReal, suffix: ' und/min', isInv: false },
                  { label: 'Disponibilidad de Tiempo', valA: metricsPeriodA.totals.disponibilidadGlobal, valB: metricsPeriodB.totals.disponibilidadGlobal, suffix: '%', isInv: false },
                  { label: 'Tasa de Calidad', valA: metricsPeriodA.totals.tasaCalidadGlobal, valB: metricsPeriodB.totals.tasaCalidadGlobal, suffix: '%', isInv: false },
                  { label: 'Tasa de Merma / Scrap', valA: metricsPeriodA.totals.mermaPctGlobal, valB: metricsPeriodB.totals.mermaPctGlobal, suffix: '%', isInv: true },
                  { label: 'Pliegos Buenos (Conformes)', valA: metricsPeriodA.totals.totalPliegosBuenos, valB: metricsPeriodB.totals.totalPliegosBuenos, suffix: ' pliegos', isInv: false },
                  { label: 'Pliegos Defectuosos (Scrap)', valA: metricsPeriodA.totals.totalPliegosMalos, valB: metricsPeriodB.totals.totalPliegosMalos, suffix: ' pliegos', isInv: true },
                  { label: 'Minutos Netos en Producción', valA: metricsPeriodA.totals.totalMinutosProduccion, valB: metricsPeriodB.totals.totalMinutosProduccion, suffix: ' min', isInv: false },
                  { label: 'Minutos en Paradas / Mantenimiento', valA: metricsPeriodA.totals.totalMinutosParadas, valB: metricsPeriodB.totals.totalMinutosParadas, suffix: ' min', isInv: true },
                ].map(row => {
                  const d = computeDelta(row.valA, row.valB, row.isInv);
                  return (
                    <tr key={row.label} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">
                        {row.label}
                      </td>
                      <td className="py-2 px-3 text-right font-bold bg-blue-50/20 text-blue-900">
                        {typeof row.valA === 'number' ? row.valA.toLocaleString() : row.valA}{row.suffix}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        {typeof row.valB === 'number' ? row.valB.toLocaleString() : row.valB}{row.suffix}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          d.trend === 'better'
                            ? 'bg-emerald-50 text-emerald-700'
                            : d.trend === 'worse'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {d.diff > 0 ? `+${d.diff.toLocaleString()}` : d.diff.toLocaleString()}{row.suffix}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {d.trend === 'better' ? (
                          <span className="text-emerald-600 text-[11px] font-semibold flex items-center justify-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" /> Favorable
                          </span>
                        ) : d.trend === 'worse' ? (
                          <span className="text-rose-600 text-[11px] font-semibold flex items-center justify-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5" /> Desfavorable
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] flex items-center justify-center gap-1">
                            <Minus className="w-3.5 h-3.5" /> Neutro
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODO 3: COMPARACIÓN POR GRUPO DE OPERADORES
      ========================================================================= */}
      {activeMode === 'operators' && (
        <div className="space-y-5">
          {/* PANEL DE SELECCIÓN DE GRUPO DE OPERADORES */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase">
                  Grupo de Operadores a Comparar ({selectedOperators.length} seleccionados de {availableOperators.length})
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAllOperators}
                  className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium cursor-pointer"
                >
                  Seleccionar Todos
                </button>
                <button
                  type="button"
                  onClick={clearOperators}
                  className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium cursor-pointer"
                >
                  Restablecer
                </button>

                {/* Filtro Máquina para el grupo */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2 py-1 ml-2">
                  <span className="text-slate-500">Filtrar Máquina:</span>
                  <select
                    value={opGroupMachine}
                    onChange={(e) => setOpGroupMachine(e.target.value)}
                    className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="TODAS">Todas las máquinas</option>
                    {activeMachines.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* CHIPS DE OPERADORES PARA MULTI-SELECCIÓN */}
            <div className="flex flex-wrap gap-1.5 pt-1 max-h-36 overflow-y-auto">
              {availableOperators.map(op => {
                const isSelected = selectedOperators.includes(op);
                return (
                  <button
                    key={op}
                    type="button"
                    onClick={() => toggleOperator(op)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{op}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* KPI RESUMEN CONSOLIDADO DEL GRUPO */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">OEE Promedio Grupo</span>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">
                {metricsOperatorGroup.totals.oeeGlobal}%
              </p>
              <span className="text-[10px] text-slate-400">Ponderado en tiempo de producción</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Velocidad Promedio Real</span>
              <p className="text-2xl font-mono font-bold text-blue-700 mt-1">
                {metricsOperatorGroup.totals.velocidadPromedioReal} <span className="text-xs font-normal">u/m</span>
              </p>
              <span className="text-[10px] text-slate-400">Eficiencia: {metricsOperatorGroup.totals.eficienciaGlobalVelocidad}%</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Tasa de Calidad Grupo</span>
              <p className="text-2xl font-mono font-bold text-emerald-700 mt-1">
                {metricsOperatorGroup.totals.tasaCalidadGlobal}%
              </p>
              <span className="text-[10px] text-rose-500">Merma: {metricsOperatorGroup.totals.mermaPctGlobal}%</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Producción Total Conforme</span>
              <p className="text-2xl font-mono font-bold text-slate-900 mt-1">
                {metricsOperatorGroup.totals.totalPliegosBuenos.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400">En {Math.round((metricsOperatorGroup.totals.totalMinutosProduccion / 60) * 10) / 10} horas netas</span>
            </div>
          </div>

          {/* TABLA COMPARATIVA HEAD-TO-HEAD DE LOS OPERADORES DEL GRUPO */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-900 uppercase flex items-center justify-between">
              <span>Comparación Individual de Operadores en el Grupo ({metricsOperatorGroup.operatorMetrics.length})</span>
              <span className="text-slate-500 font-normal">Ordenado por Eficiencia de Velocidad</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Ranking</th>
                    <th className="py-2.5 px-3">Operador</th>
                    <th className="py-2.5 px-3 text-right">Vel. Real (u/m)</th>
                    <th className="py-2.5 px-3 text-right">Meta Est. (u/m)</th>
                    <th className="py-2.5 px-3 text-right">Eficiencia (%)</th>
                    <th className="py-2.5 px-3 text-right">Calidad (%)</th>
                    <th className="py-2.5 px-3 text-right">Pliegos Buenos</th>
                    <th className="py-2.5 px-3 text-right">Merma (Malos)</th>
                    <th className="py-2.5 px-3 text-right">Horas Prod</th>
                    <th className="py-2.5 px-3">Máquinas Operadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {metricsOperatorGroup.operatorMetrics.map((op, idx) => (
                    <tr key={op.operador} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-slate-500">
                        #{idx + 1}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        {op.operador}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-900">
                        {op.realUndMin} u/m
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {op.metaUndMinEstimada}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={`inline-flex items-center gap-1 font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                          op.eficienciaVelocidad >= 95
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : op.eficienciaVelocidad >= 85
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {op.eficienciaVelocidad}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        <span className={op.tasaCalidad >= (globalSettings?.globalQualityTargetPct ?? 98) ? 'text-emerald-700' : 'text-amber-700'}>
                          {op.tasaCalidad}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                        {op.pliegosBuenos.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-rose-600">
                        {op.pliegosMalos.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {Math.round((op.minutosProd / 60) * 10) / 10} h
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px] max-w-[200px] truncate" title={op.maquinas.join(', ')}>
                        {op.maquinas.join(', ') || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODO 4: GRUPO DE MÁQUINAS DE UN OPERADOR ESPECÍFICO
      ========================================================================= */}
      {activeMode === 'operator-machines' && (
        <div className="space-y-5">
          {/* BARRA DE SELECCIÓN DEL OPERADOR */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-600">Seleccionar Operador a Evaluar:</span>
                <select
                  value={targetOperatorForMachines}
                  onChange={(e) => setTargetOperatorForMachines(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {availableOperators.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>Máquinas asignadas/operadas:</span>
                <span className="font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  {machinesForSelectedOp.length} máquinas
                </span>
              </div>
            </div>
          </div>

          {/* RESUMEN GLOBAL DEL OPERADOR SELECCIONADO */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Ficha de Desempeño Multimáquina</span>
              <h3 className="text-lg font-bold text-white mt-0.5">{targetOperatorForMachines}</h3>
              <p className="text-xs text-slate-400 mt-1">
                Visualiza el rendimiento, velocidad y nivel de merma de este operador en cada una de las diferentes máquinas que ha operado en planta.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Total Pliegos:</span>
                <strong className="font-mono text-emerald-400 text-sm">
                  {metricsSingleOp.totals.totalPliegosBuenos.toLocaleString()}
                </strong>
              </div>
              <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Horas en Producción:</span>
                <strong className="font-mono text-blue-400 text-sm">
                  {Math.round((metricsSingleOp.totals.totalMinutosProduccion / 60) * 10) / 10} h
                </strong>
              </div>
              <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Tasa de Calidad:</span>
                <strong className="font-mono text-amber-400 text-sm">
                  {metricsSingleOp.totals.tasaCalidadGlobal}%
                </strong>
              </div>
            </div>
          </div>

          {/* TABLA COMPARATIVA DE MÁQUINAS OPERADAS POR ESTE OPERADOR */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-900 uppercase flex items-center justify-between">
              <span>Desempeño de {targetOperatorForMachines} por Máquina ({metricsSingleOp.machineMetrics.length})</span>
              <span className="text-slate-500 font-normal">Comparación cruzada vs metas oficiales</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Máquina</th>
                    <th className="py-2.5 px-3 text-right">Meta (u/m)</th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/60 text-blue-900">Vel. Real Operador</th>
                    <th className="py-2.5 px-3 text-right">Eficiencia (%)</th>
                    <th className="py-2.5 px-3 text-right">OEE Máquina</th>
                    <th className="py-2.5 px-3 text-right">Tasa Calidad</th>
                    <th className="py-2.5 px-3 text-right">Pliegos Buenos</th>
                    <th className="py-2.5 px-3 text-right">Pliegos Defectuosos</th>
                    <th className="py-2.5 px-3 text-right">Horas Prod</th>
                    <th className="py-2.5 px-3 text-center">Evaluación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {metricsSingleOp.machineMetrics.map(m => {
                    const isTop = m.eficienciaVelocidad >= 95;
                    return (
                      <tr key={m.maqDes} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {m.maqDes}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                          {m.metaUndMin}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold bg-blue-50/40 text-blue-950">
                          {m.realUndMin} u/m
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          <span className={m.eficienciaVelocidad >= 95 ? 'text-emerald-700' : m.eficienciaVelocidad >= 85 ? 'text-amber-700' : 'text-rose-700'}>
                            {m.eficienciaVelocidad}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                          {m.oee}%
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          <span className={m.tasaCalidad >= (globalSettings?.globalQualityTargetPct ?? 98) ? 'text-emerald-700 font-bold' : 'text-amber-700'}>
                            {m.tasaCalidad}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                          {m.pliegosBuenos.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600">
                          {m.pliegosMalos.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {Math.round((m.minutosProd / 60) * 10) / 10} h
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            m.status === 'green'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : m.status === 'yellow'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            {m.status === 'green' ? 'Cumple Meta' : m.status === 'yellow' ? 'En Alerta' : 'Bajo Meta'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

import { ProductionRecord, MachineTarget, FilterState, SHIFT_BASE_MINUTES } from '../types';
import { getShiftFromTime } from './shifts';

// Lista por defecto de eventos que constituyen tiempo neto de producción
export const DEFAULT_PRODUCTION_EVENTS = [
  'Producción',
  'PRODUCCION',
  'Produccion',
  'Tirada',
  'Tirada Normal',
  'Tiraje',
  'Corrida',
  'Fabricación'
];

/**
 * Determina si un proceso/evento cuenta como tiempo productivo
 */
export function isProductionProcess(processName: string, customProductionEvents?: string[]): boolean {
  if (!processName) return false;
  const list = customProductionEvents || DEFAULT_PRODUCTION_EVENTS;
  const normalized = processName.trim().toLowerCase();
  
  return list.some(item => item.toLowerCase() === normalized) ||
         normalized.includes('producc') ||
         normalized.includes('tirada') ||
         normalized.includes('tiraje');
}

/**
 * Sincroniza máquinas detectadas en el Excel con la lista de metas configuradas.
 * Las nuevas máquinas se agregan con valores por defecto basados en 675 min (11.25h).
 */
export function syncMachinesFromRecords(
  records: ProductionRecord[],
  existingTargets: MachineTarget[],
  deletedMachineNames: Set<string> = new Set(),
  globalSettings?: { globalQualityTargetPct?: number; globalWarningThresholdPct?: number }
): MachineTarget[] {
  const existingMap = new Map<string, MachineTarget>();
  existingTargets.forEach(t => existingMap.set(t.maqDes.trim().toLowerCase(), t));

  const result = [...existingTargets];

  records.forEach(r => {
    const rawName = (r.MaqDes || '').trim();
    if (!rawName) return;
    const lowerName = rawName.toLowerCase();

    // Si no existe y no fue borrada explícitamente por el usuario
    if (!existingMap.has(lowerName) && !deletedMachineNames.has(lowerName)) {
      const defaultUndMin = 120;
      const newTarget: MachineTarget = {
        id: `auto-target-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        maqDes: rawName,
        targetUndMin: defaultUndMin,
        targetQualityPct: globalSettings?.globalQualityTargetPct ?? 98.0,
        targetAvailabilityPct: 75.0,
        warningThresholdPct: globalSettings?.globalWarningThresholdPct ?? 85.0,
        active: true,
        notes: 'Detectada automáticamente desde datos de producción',
        metaTurnoBase: defaultUndMin * SHIFT_BASE_MINUTES, // 120 * 675 = 81,000 und/turno
      };
      existingMap.set(lowerName, newTarget);
      result.push(newTarget);
    }
  });

  return result;
}

/**
 * Calcula métricas consolidadas a partir de un conjunto de registros filtrados y metas.
 * REGLAS ESTRICTAS:
 * 1. Solo se consideran máquinas que existan actualmente en machineTargets (las borradas se excluyen).
 * 2. Si activeMachineFilter != 'TODAS', SOLAMENTE se devuelve y calcula esa máquina específica.
 * 3. Si activeMachineFilter == 'TODAS', solo se devuelven las máquinas presentes en el conjunto filtrado.
 */
export function calculateConsolidatedMetrics(
  records: ProductionRecord[],
  machineTargets: MachineTarget[],
  customProductionEvents?: string[],
  activeMachineFilter?: string,
  globalSettings?: { globalQualityTargetPct?: number; globalWarningThresholdPct?: number }
) {
  // Whitelist de máquinas activas/configuradas
  const targetLookup = new Map<string, MachineTarget>();
  machineTargets.forEach(t => targetLookup.set(t.maqDes.trim().toLowerCase(), t));

  // Filtrar registros: solo los que pertenezcan a máquinas que existen en machineTargets
  const validRecords = records.filter(r => {
    const mName = (r.MaqDes || '').trim().toLowerCase();
    if (!targetLookup.has(mName)) return false;
    if (activeMachineFilter && activeMachineFilter !== 'TODAS') {
      if (mName !== activeMachineFilter.trim().toLowerCase()) return false;
    }
    return true;
  });

  let totalPliegosBuenos = 0;
  let totalPliegosMalos = 0;
  let totalMinutos = 0;
  let totalMinutosProduccion = 0;
  let totalMinutosParadas = 0;

  // Mapa por máquina (indexado por nombre en minúsculas para consistencia)
  const machineMap = new Map<string, {
    maqDes: string;
    totalMinutos: number;
    minutosProd: number;
    minutosParada: number;
    pliegosBuenos: number;
    pliegosMalos: number;
    recordsCount: number;
    procesos: Record<string, number>;
  }>();

  // Si se filtró una máquina específica pero aún no tiene registros en el periodo, la inicializamos
  if (activeMachineFilter && activeMachineFilter !== 'TODAS') {
    const target = targetLookup.get(activeMachineFilter.trim().toLowerCase());
    const exactName = target ? target.maqDes : activeMachineFilter.trim();
    machineMap.set(exactName.toLowerCase(), {
      maqDes: exactName,
      totalMinutos: 0,
      minutosProd: 0,
      minutosParada: 0,
      pliegosBuenos: 0,
      pliegosMalos: 0,
      recordsCount: 0,
      procesos: {},
    });
  }

  // Mapa por operador (solo de los registros filtrados)
  const operatorMap = new Map<string, {
    operador: string;
    totalMinutos: number;
    minutosProd: number;
    pliegosBuenos: number;
    pliegosMalos: number;
    recordsCount: number;
    maquinas: Set<string>;
  }>();

  // Mapa de eventos/procesos (solo de los registros filtrados)
  const processMap = new Map<string, {
    proceso: string;
    minutos: number;
    veces: number;
    esProduccion: boolean;
  }>();

  validRecords.forEach(rec => {
    const min = Number(rec.minutos) || 0;
    const buenos = Number(rec.PliegosParc) || 0;
    const malos = Number(rec.pliegosparcmal) || 0;
    const isProd = isProductionProcess(rec.Proceso, customProductionEvents);

    totalMinutos += min;
    totalPliegosBuenos += buenos;
    totalPliegosMalos += malos;

    if (isProd) {
      totalMinutosProduccion += min;
    } else {
      totalMinutosParadas += min;
    }

    // Acumular máquina
    const rawMName = rec.MaqDes ? rec.MaqDes.trim() : 'Máquina';
    const lowerMName = rawMName.toLowerCase();

    if (!machineMap.has(lowerMName)) {
      const target = targetLookup.get(lowerMName);
      const exactName = target ? target.maqDes : rawMName;
      machineMap.set(lowerMName, {
        maqDes: exactName,
        totalMinutos: 0,
        minutosProd: 0,
        minutosParada: 0,
        pliegosBuenos: 0,
        pliegosMalos: 0,
        recordsCount: 0,
        procesos: {},
      });
    }
    const mEntry = machineMap.get(lowerMName)!;
    mEntry.totalMinutos += min;
    mEntry.recordsCount += 1;
    mEntry.pliegosBuenos += buenos;
    mEntry.pliegosMalos += malos;
    if (isProd) {
      mEntry.minutosProd += min;
    } else {
      mEntry.minutosParada += min;
    }
    mEntry.procesos[rec.Proceso] = (mEntry.procesos[rec.Proceso] || 0) + min;

    // Acumular operador
    const opName = (rec.DesOperador || 'Sin Operador').trim();
    if (!operatorMap.has(opName)) {
      operatorMap.set(opName, {
        operador: opName,
        totalMinutos: 0,
        minutosProd: 0,
        pliegosBuenos: 0,
        pliegosMalos: 0,
        recordsCount: 0,
        maquinas: new Set<string>(),
      });
    }
    const opEntry = operatorMap.get(opName)!;
    opEntry.totalMinutos += min;
    opEntry.recordsCount += 1;
    opEntry.pliegosBuenos += buenos;
    opEntry.pliegosMalos += malos;
    if (isProd) {
      opEntry.minutosProd += min;
    }
    opEntry.maquinas.add(mEntry.maqDes);

    // Acumular procesos
    const pName = (rec.Proceso || 'Sin Proceso').trim();
    if (!processMap.has(pName)) {
      processMap.set(pName, {
        proceso: pName,
        minutos: 0,
        veces: 0,
        esProduccion: isProd,
      });
    }
    const pEntry = processMap.get(pName)!;
    pEntry.minutos += min;
    pEntry.veces += 1;
  });

  // Cálculo de KPIs globales
  const totalPliegos = totalPliegosBuenos + totalPliegosMalos;
  const tasaCalidadGlobal = totalPliegos > 0 ? (totalPliegosBuenos / totalPliegos) * 100 : 100;
  const mermaPctGlobal = totalPliegos > 0 ? (totalPliegosMalos / totalPliegos) * 100 : 0;
  const disponibilidadGlobal = totalMinutos > 0 ? (totalMinutosProduccion / totalMinutos) * 100 : 0;
  const velocidadPromedioReal = totalMinutosProduccion > 0 ? (totalPliegosBuenos / totalMinutosProduccion) : 0;

  const globalQualityTarget = globalSettings?.globalQualityTargetPct ?? 98;
  const globalWarningThreshold = globalSettings?.globalWarningThresholdPct ?? 85;

  // Métricas procesadas por máquina
  const machineMetrics = Array.from(machineMap.values()).map(m => {
    const target = targetLookup.get(m.maqDes.trim().toLowerCase());
    const metaUndMin = target?.targetUndMin || 100;
    const metaTurnoBase = target?.metaTurnoBase || (metaUndMin * SHIFT_BASE_MINUTES);
    const metaCalidad = globalSettings?.globalQualityTargetPct ?? target?.targetQualityPct ?? 98;
    const warningThreshold = globalSettings?.globalWarningThresholdPct ?? target?.warningThresholdPct ?? 85;

    // Velocidad real = Pliegos Buenos / Minutos netos de PRODUCCIÓN
    const realUndMin = m.minutosProd > 0 ? (m.pliegosBuenos / m.minutosProd) : 0;
    const eficienciaVelocidad = metaUndMin > 0 ? (realUndMin / metaUndMin) * 100 : 0;
    const totalMPliegos = m.pliegosBuenos + m.pliegosMalos;
    const tasaCalidad = totalMPliegos > 0 ? (m.pliegosBuenos / totalMPliegos) * 100 : 100;
    const disponibilidad = m.totalMinutos > 0 ? (m.minutosProd / m.totalMinutos) * 100 : 0;
    
    // OEE de la máquina = Disponibilidad * Rendimiento (capped a 1.2) * Calidad
    const rendimientoFactor = Math.min(eficienciaVelocidad / 100, 1.2);
    const oee = (disponibilidad / 100) * rendimientoFactor * (tasaCalidad / 100) * 100;

    let status: 'green' | 'yellow' | 'red' = 'green';
    if (m.recordsCount === 0) {
      status = 'yellow';
    } else if (eficienciaVelocidad < warningThreshold) {
      status = 'red';
    } else if (eficienciaVelocidad < 95) {
      status = 'yellow';
    }

    return {
      ...m,
      metaUndMin,
      metaTurnoBase,
      metaCalidad,
      warningThreshold,
      realUndMin: Math.round(realUndMin * 10) / 10,
      eficienciaVelocidad: Math.round(eficienciaVelocidad * 10) / 10,
      tasaCalidad: Math.round(tasaCalidad * 10) / 10,
      disponibilidad: Math.round(disponibilidad * 10) / 10,
      oee: Math.round(oee * 10) / 10,
      status,
    };
  }).sort((a, b) => b.eficienciaVelocidad - a.eficienciaVelocidad);

  // Eficiencia ponderada global de velocidad
  let sumaPonderadaVelocidad = 0;
  let pesoTotalProdMin = 0;
  machineMetrics.forEach(m => {
    sumaPonderadaVelocidad += m.eficienciaVelocidad * m.minutosProd;
    pesoTotalProdMin += m.minutosProd;
  });
  const eficienciaGlobalVelocidad = pesoTotalProdMin > 0 ? (sumaPonderadaVelocidad / pesoTotalProdMin) : 0;
  const oeeGlobal = (disponibilidadGlobal / 100) * Math.min(eficienciaGlobalVelocidad / 100, 1.2) * (tasaCalidadGlobal / 100) * 100;

  // Métricas procesadas por operador
  const operatorMetrics = Array.from(operatorMap.values()).map(op => {
    const realUndMin = op.minutosProd > 0 ? (op.pliegosBuenos / op.minutosProd) : 0;
    const totalOpPliegos = op.pliegosBuenos + op.pliegosMalos;
    const tasaCalidad = totalOpPliegos > 0 ? (op.pliegosBuenos / totalOpPliegos) * 100 : 100;
    const tasaMerma = totalOpPliegos > 0 ? (op.pliegosMalos / totalOpPliegos) * 100 : 0;
    
    let metaUndMinEstimada = 0;
    const mArray = Array.from(op.maquinas);
    if (mArray.length > 0) {
      const metas = mArray.map(mName => targetLookup.get(mName.trim().toLowerCase())?.targetUndMin || 100);
      metaUndMinEstimada = metas.reduce((a, b) => a + b, 0) / metas.length;
    } else {
      metaUndMinEstimada = 100;
    }
    const eficienciaVelocidad = metaUndMinEstimada > 0 ? (realUndMin / metaUndMinEstimada) * 100 : 0;

    return {
      operador: op.operador,
      totalMinutos: op.totalMinutos,
      minutosProd: op.minutosProd,
      pliegosBuenos: op.pliegosBuenos,
      pliegosMalos: op.pliegosMalos,
      recordsCount: op.recordsCount,
      maquinas: Array.from(op.maquinas),
      realUndMin: Math.round(realUndMin * 10) / 10,
      metaUndMinEstimada: Math.round(metaUndMinEstimada),
      metaTurnoBaseEstimada: Math.round(metaUndMinEstimada * SHIFT_BASE_MINUTES),
      eficienciaVelocidad: Math.round(eficienciaVelocidad * 10) / 10,
      tasaCalidad: Math.round(tasaCalidad * 10) / 10,
      tasaMerma: Math.round(tasaMerma * 10) / 10,
    };
  }).sort((a, b) => b.eficienciaVelocidad - a.eficienciaVelocidad);

  // Lista de procesos ordenados por minutos
  const topEvents = Array.from(processMap.values()).map(p => ({
    proceso: p.proceso,
    minutos: p.minutos,
    veces: p.veces,
    esProduccion: p.esProduccion,
    porcentaje: totalMinutos > 0 ? Math.round((p.minutos / totalMinutos) * 1000) / 10 : 0,
  })).sort((a, b) => b.minutos - a.minutos);

  return {
    totals: {
      totalRecords: validRecords.length,
      totalPliegosBuenos,
      totalPliegosMalos,
      totalPliegos,
      totalMinutos,
      totalMinutosProduccion,
      totalMinutosParadas,
      velocidadPromedioReal: Math.round(velocidadPromedioReal * 10) / 10,
      eficienciaGlobalVelocidad: Math.round(eficienciaGlobalVelocidad * 10) / 10,
      tasaCalidadGlobal: Math.round(tasaCalidadGlobal * 10) / 10,
      mermaPctGlobal: Math.round(mermaPctGlobal * 10) / 10,
      disponibilidadGlobal: Math.round(disponibilidadGlobal * 10) / 10,
      oeeGlobal: Math.round(oeeGlobal * 10) / 10,
      turnoBaseMinutos: SHIFT_BASE_MINUTES,
    },
    machineMetrics,
    operatorMetrics,
    topEvents,
  };
}

/**
 * Filtra registros según el estado de filtros.
 * EXCLUYE automáticamente cualquier registro cuya máquina no exista en machineTargets.
 */
export function filterProductionRecords(
  records: ProductionRecord[],
  filters: FilterState,
  machineTargets: MachineTarget[],
  currentSystemShift: 'DIA' | 'NOCHE'
): ProductionRecord[] {
  // Whitelist de máquinas activas/configuradas
  const targetMap = new Map<string, MachineTarget>();
  machineTargets.forEach(t => targetMap.set(t.maqDes.trim().toLowerCase(), t));

  return records.filter(rec => {
    // 0. Si la máquina fue eliminada de la lista de máquinas, se excluyen sus registros
    const mKey = (rec.MaqDes || '').trim().toLowerCase();
    if (!targetMap.has(mKey)) {
      return false;
    }

    // 1. Filtro Turno (evaluado con regla de planta: Día 07:05-18:59, Noche 19:00-07:04)
    const recShift = getShiftFromTime(rec.HORAINI) || rec.turno;
    if (filters.turno === 'DIA' && recShift !== 'DIA') return false;
    if (filters.turno === 'NOCHE' && recShift !== 'NOCHE') return false;
    if (filters.turno === 'ACTUAL' && recShift !== currentSystemShift) return false;

    // 2. Filtro Máquina (coincidencia estricta)
    if (filters.maqDes && filters.maqDes !== 'TODAS') {
      if ((rec.MaqDes || '').trim().toLowerCase() !== filters.maqDes.trim().toLowerCase()) return false;
    }

    // 3. Filtro Operador (coincidencia estricta)
    if (filters.desOperador && filters.desOperador !== 'TODOS') {
      if ((rec.DesOperador || '').trim().toLowerCase() !== filters.desOperador.trim().toLowerCase()) return false;
    }

    // 4. Filtro Proceso/Evento (coincidencia estricta)
    if (filters.proceso && filters.proceso !== 'TODOS') {
      if ((rec.Proceso || '').trim().toLowerCase() !== filters.proceso.trim().toLowerCase()) return false;
    }

    // 5. Filtro Fecha Inicio / Fin
    if (filters.fechaInicio && rec.FECHAINI) {
      const recDate = normalizeDateStr(rec.FECHAINI);
      if (recDate && recDate < filters.fechaInicio) return false;
    }
    if (filters.fechaFin && rec.FECHAINI) {
      const recDate = normalizeDateStr(rec.FECHAINI);
      if (recDate && recDate > filters.fechaFin) return false;
    }

    // 6. Búsqueda libre (OP, Descripción u Operador)
    if (filters.busqueda && filters.busqueda.trim()) {
      const term = filters.busqueda.toLowerCase().trim();
      const matchOp = (rec.odtcod || '').toLowerCase().includes(term);
      const matchDesc = (rec.ODTDESCRIP || '').toLowerCase().includes(term);
      const matchOpName = (rec.DesOperador || '').toLowerCase().includes(term);
      if (!matchOp && !matchDesc && !matchOpName) return false;
    }

    return true;
  });
}

function normalizeDateStr(dStr: string): string | null {
  if (!dStr) return null;
  const s = dStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10);
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
    const parts = s.split('/');
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return null;
}

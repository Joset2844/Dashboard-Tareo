import { ProductionRecord, ShiftType } from '../types';
import { isProductionProcess } from './metrics';
import { normalizeDateToYMD } from './shifts';

export interface EventFilterState {
  proceso: string;             // 'TODOS' o nombre específico de evento
  fechaInicio: string;        // YYYY-MM-DD
  fechaFin: string;           // YYYY-MM-DD
  maquinas: string[];         // Lista de máquinas seleccionadas (o ['TODAS'])
  operador: string;           // 'TODOS' o nombre de operador
  turno: 'TODOS' | 'DIA' | 'NOCHE' | 'ACTUAL';
  busqueda: string;
}

export interface EventMachineImpact {
  maqDes: string;
  minutos: number;
  horas: number;
  veces: number;
  porcentajeDelEvento: number; // % sobre el tiempo total del evento analizado
  pliegosBuenos: number;
  pliegosMalos: number;
  duracionPromedioMin: number;
  operadoresInvolucrados: string[];
}

export interface EventOperatorImpact {
  operador: string;
  minutos: number;
  horas: number;
  veces: number;
  porcentajeDelEvento: number;
  pliegosBuenos: number;
  pliegosMalos: number;
  duracionPromedioMin: number;
  maquinasInvolucradas: string[];
}

export interface EventDateImpact {
  fecha: string;
  turno: ShiftType;
  minutos: number;
  horas: number;
  veces: number;
  maquinas: string[];
  operadores: string[];
}

export interface EventAnalysisSummary {
  eventoNombre: string;
  esProduccion: boolean;
  totalMinutos: number;
  totalHoras: number;
  totalOcurrencias: number;
  duracionPromedioMin: number;
  totalPliegosBuenos: number;
  totalPliegosMalos: number;
  minutosPlantaTotalPeriodo: number;
  porcentajeSobreTotalPlanta: number;
  maquinaMasAfectada: { maqDes: string; minutos: number; veces: number } | null;
  operadorMasInvolucrado: { operador: string; minutos: number; veces: number } | null;
  fechaMayorIncidencia: { fecha: string; minutos: number } | null;
  maquinasImpacto: EventMachineImpact[];
  operadoresImpacto: EventOperatorImpact[];
  fechasImpacto: EventDateImpact[];
  registrosFiltrados: ProductionRecord[];
}

/**
 * Filtra los registros según los criterios del análisis de eventos
 */
export function filterRecordsForEvent(
  records: ProductionRecord[],
  filters: EventFilterState,
  currentSystemShift: ShiftType
): ProductionRecord[] {
  const selectedMachinesLower = filters.maquinas
    .filter(m => m !== 'TODAS')
    .map(m => m.trim().toLowerCase());

  return records.filter(rec => {
    // 1. Filtro por Evento / Proceso
    if (filters.proceso !== 'TODOS') {
      const recProc = (rec.Proceso || '').trim().toLowerCase();
      if (recProc !== filters.proceso.trim().toLowerCase()) return false;
    }

    // 2. Filtro por Máquinas (multiselección)
    if (selectedMachinesLower.length > 0) {
      const recMaq = (rec.MaqDes || '').trim().toLowerCase();
      if (!selectedMachinesLower.includes(recMaq)) return false;
    }

    // 3. Filtro por Operador
    if (filters.operador !== 'TODOS') {
      const recOp = (rec.DesOperador || '').trim().toLowerCase();
      if (recOp !== filters.operador.trim().toLowerCase()) return false;
    }

    // 4. Filtro por Turno
    if (filters.turno !== 'TODOS') {
      const targetShift = filters.turno === 'ACTUAL' ? currentSystemShift : filters.turno;
      if (rec.turno !== targetShift) return false;
    }

    // 5. Filtro por Rango de Fechas (usa la fecha operativa del turno fechaTurno o FECHAINI)
    const recFecha = rec.fechaTurno || normalizeDateToYMD(rec.FECHAINI);
    if (filters.fechaInicio && recFecha < filters.fechaInicio) return false;
    if (filters.fechaFin && recFecha > filters.fechaFin) return false;

    // 6. Búsqueda libre
    if (filters.busqueda.trim()) {
      const query = filters.busqueda.trim().toLowerCase();
      const match =
        (rec.odtcod || '').toLowerCase().includes(query) ||
        (rec.ODTDESCRIP || '').toLowerCase().includes(query) ||
        (rec.MaqDes || '').toLowerCase().includes(query) ||
        (rec.DesOperador || '').toLowerCase().includes(query) ||
        (rec.Proceso || '').toLowerCase().includes(query);
      if (!match) return false;
    }

    return true;
  });
}

/**
 * Calcula el análisis consolidado de un evento específico o global
 */
export function calculateEventAnalysis(
  filteredEventRecords: ProductionRecord[],
  allRecordsInPeriod: ProductionRecord[],
  selectedEventName: string,
  customProductionEvents: string[]
): EventAnalysisSummary {
  const isProd = isProductionProcess(selectedEventName, customProductionEvents);

  let totalMinutos = 0;
  let totalPliegosBuenos = 0;
  let totalPliegosMalos = 0;

  const machineMap = new Map<string, {
    minutos: number;
    veces: number;
    pliegosBuenos: number;
    pliegosMalos: number;
    operadores: Set<string>;
  }>();

  const operatorMap = new Map<string, {
    minutos: number;
    veces: number;
    pliegosBuenos: number;
    pliegosMalos: number;
    maquinas: Set<string>;
  }>();

  const dateMap = new Map<string, {
    fecha: string;
    turno: ShiftType;
    minutos: number;
    veces: number;
    maquinas: Set<string>;
    operadores: Set<string>;
  }>();

  // Calcular tiempo total de la planta en los mismos registros de periodo para calcular % de impacto
  const minutosPlantaTotalPeriodo = allRecordsInPeriod.reduce((acc, r) => acc + (Number(r.minutos) || 0), 0);

  filteredEventRecords.forEach(rec => {
    const min = Number(rec.minutos) || 0;
    const buenos = Number(rec.PliegosParc) || 0;
    const malos = Number(rec.pliegosparcmal) || 0;
    const maq = (rec.MaqDes || 'Sin Máquina').trim();
    const op = (rec.DesOperador || 'Sin Operador').trim();
    const fecha = rec.fechaTurno || normalizeDateToYMD(rec.FECHAINI);
    const turno = rec.turno || 'DIA';
    const dateKey = `${fecha}_${turno}`;

    totalMinutos += min;
    totalPliegosBuenos += buenos;
    totalPliegosMalos += malos;

    // Desglose por Máquina
    if (!machineMap.has(maq)) {
      machineMap.set(maq, { minutos: 0, veces: 0, pliegosBuenos: 0, pliegosMalos: 0, operadores: new Set() });
    }
    const mData = machineMap.get(maq)!;
    mData.minutos += min;
    mData.veces += 1;
    mData.pliegosBuenos += buenos;
    mData.pliegosMalos += malos;
    if (op) mData.operadores.add(op);

    // Desglose por Operador
    if (!operatorMap.has(op)) {
      operatorMap.set(op, { minutos: 0, veces: 0, pliegosBuenos: 0, pliegosMalos: 0, maquinas: new Set() });
    }
    const opData = operatorMap.get(op)!;
    opData.minutos += min;
    opData.veces += 1;
    opData.pliegosBuenos += buenos;
    opData.pliegosMalos += malos;
    if (maq) opData.maquinas.add(maq);

    // Desglose por Fecha y Turno
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { fecha, turno, minutos: 0, veces: 0, maquinas: new Set(), operadores: new Set() });
    }
    const dData = dateMap.get(dateKey)!;
    dData.minutos += min;
    dData.veces += 1;
    if (maq) dData.maquinas.add(maq);
    if (op) dData.operadores.add(op);
  });

  const totalOcurrencias = filteredEventRecords.length;
  const totalHoras = Math.round((totalMinutos / 60) * 10) / 10;
  const duracionPromedioMin = totalOcurrencias > 0 ? Math.round(totalMinutos / totalOcurrencias) : 0;
  const porcentajeSobreTotalPlanta = minutosPlantaTotalPeriodo > 0
    ? Math.round((totalMinutos / minutosPlantaTotalPeriodo) * 1000) / 10
    : 0;

  // Formatear impacto por máquina
  const maquinasImpacto: EventMachineImpact[] = Array.from(machineMap.entries())
    .map(([maqDes, data]) => ({
      maqDes,
      minutos: data.minutos,
      horas: Math.round((data.minutos / 60) * 10) / 10,
      veces: data.veces,
      porcentajeDelEvento: totalMinutos > 0 ? Math.round((data.minutos / totalMinutos) * 1000) / 10 : 0,
      pliegosBuenos: data.pliegosBuenos,
      pliegosMalos: data.pliegosMalos,
      duracionPromedioMin: data.veces > 0 ? Math.round(data.minutos / data.veces) : 0,
      operadoresInvolucrados: Array.from(data.operadores).sort(),
    }))
    .sort((a, b) => b.minutos - a.minutos);

  // Formatear impacto por operador
  const operadoresImpacto: EventOperatorImpact[] = Array.from(operatorMap.entries())
    .map(([operador, data]) => ({
      operador,
      minutos: data.minutos,
      horas: Math.round((data.minutos / 60) * 10) / 10,
      veces: data.veces,
      porcentajeDelEvento: totalMinutos > 0 ? Math.round((data.minutos / totalMinutos) * 1000) / 10 : 0,
      pliegosBuenos: data.pliegosBuenos,
      pliegosMalos: data.pliegosMalos,
      duracionPromedioMin: data.veces > 0 ? Math.round(data.minutos / data.veces) : 0,
      maquinasInvolucradas: Array.from(data.maquinas).sort(),
    }))
    .sort((a, b) => b.minutos - a.minutos);

  // Formatear desglose por fecha
  const fechasImpacto: EventDateImpact[] = Array.from(dateMap.values())
    .map(data => ({
      fecha: data.fecha,
      turno: data.turno,
      minutos: data.minutos,
      horas: Math.round((data.minutos / 60) * 10) / 10,
      veces: data.veces,
      maquinas: Array.from(data.maquinas).sort(),
      operadores: Array.from(data.operadores).sort(),
    }))
    .sort((a, b) => (b.fecha === a.fecha ? b.minutos - a.minutos : b.fecha.localeCompare(a.fecha)));

  const maquinaMasAfectada = maquinasImpacto.length > 0
    ? { maqDes: maquinasImpacto[0].maqDes, minutos: maquinasImpacto[0].minutos, veces: maquinasImpacto[0].veces }
    : null;

  const operadorMasInvolucrado = operadoresImpacto.length > 0
    ? { operador: operadoresImpacto[0].operador, minutos: operadoresImpacto[0].minutos, veces: operadoresImpacto[0].veces }
    : null;

  const fechaMayorIncidencia = fechasImpacto.length > 0
    ? { fecha: fechasImpacto[0].fecha, minutos: fechasImpacto[0].minutos }
    : null;

  return {
    eventoNombre: selectedEventName,
    esProduccion: isProd,
    totalMinutos,
    totalHoras,
    totalOcurrencias,
    duracionPromedioMin,
    totalPliegosBuenos,
    totalPliegosMalos,
    minutosPlantaTotalPeriodo,
    porcentajeSobreTotalPlanta,
    maquinaMasAfectada,
    operadorMasInvolucrado,
    fechaMayorIncidencia,
    maquinasImpacto,
    operadoresImpacto,
    fechasImpacto,
    registrosFiltrados: filteredEventRecords,
  };
}

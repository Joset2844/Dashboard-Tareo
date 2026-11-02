import { ProductionRecord, ShiftType, MachineTarget, GlobalPlantSettings } from '../types';
import { getShiftFromTime, getOperationalDate } from './shifts';
import { calculateConsolidatedMetrics } from './metrics';

export interface AvailableShift {
  key: string;
  fechaTurno: string;
  turno: ShiftType;
  label: string;
  recordsCount: number;
}

export interface MetricDelta {
  diff: number;
  pctChange: number;
  trend: 'better' | 'worse' | 'equal';
}

/**
 * Extrae todos los turnos con registros presentes en la base de datos,
 * ordenados cronológicamente descendente (el más reciente primero).
 */
export function getAvailableShifts(records: ProductionRecord[]): AvailableShift[] {
  const map = new Map<string, { fechaTurno: string; turno: ShiftType; count: number }>();

  records.forEach(r => {
    const shift = r.turno || getShiftFromTime(r.HORAINI);
    const opDate = r.fechaTurno || getOperationalDate(r.FECHAINI, r.HORAINI);
    const key = `${opDate}_${shift}`;

    if (!map.has(key)) {
      map.set(key, { fechaTurno: opDate, turno: shift, count: 0 });
    }
    map.get(key)!.count += 1;
  });

  const list: AvailableShift[] = [];
  map.forEach((val, key) => {
    const [year, month, day] = val.fechaTurno.split('-');
    const formattedDate = (year && month && day) ? `${day}/${month}/${year}` : val.fechaTurno;
    const shiftText = val.turno === 'DIA' ? 'Turno Día (07:00 - 18:59)' : 'Turno Noche (19:00 - 06:59)';
    list.push({
      key,
      fechaTurno: val.fechaTurno,
      turno: val.turno,
      label: `${val.fechaTurno} • ${shiftText}`,
      recordsCount: val.count,
    });
  });

  // Ordenar de más reciente a más antiguo
  return list.sort((a, b) => {
    if (a.fechaTurno !== b.fechaTurno) {
      return b.fechaTurno.localeCompare(a.fechaTurno);
    }
    // Si la fecha es igual, NOCHE es después de DIA
    return a.turno === 'NOCHE' ? -1 : 1;
  });
}

/**
 * Calcula la fecha calendario anterior restando 1 día en UTC
 */
export function subtractDays(dateStr: string, days: number = 1): string {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10) || 2026;
  const m = parseInt(parts[1], 10) || 1;
  const d = parseInt(parts[2], 10) || 1;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  const resY = dt.getUTCFullYear();
  const resM = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const resD = String(dt.getUTCDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

/**
 * Encuentra el turno inmediatamente anterior cronológico al turno indicado.
 */
export function getPreviousShiftTarget(fechaTurno: string, turno: ShiftType): { fechaTurno: string; turno: ShiftType } {
  if (turno === 'NOCHE') {
    // Si el turno actual es Noche de hoy, el turno anterior es Día de hoy
    return { fechaTurno, turno: 'DIA' };
  } else {
    // Si el turno actual es Día de hoy, el turno anterior es Noche de ayer
    const prevDate = subtractDays(fechaTurno, 1);
    return { fechaTurno: prevDate, turno: 'NOCHE' };
  }
}

/**
 * Calcula la variación y tendencia entre dos números (delta)
 */
export function computeDelta(current: number, previous: number, isInverse: boolean = false): MetricDelta {
  const diff = Math.round((current - previous) * 10) / 10;
  const pctChange = previous !== 0 
    ? Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10 
    : (current > 0 ? 100 : 0);

  let trend: 'better' | 'worse' | 'equal' = 'equal';
  if (diff > 0) {
    trend = isInverse ? 'worse' : 'better';
  } else if (diff < 0) {
    trend = isInverse ? 'better' : 'worse';
  }

  return { diff, pctChange, trend };
}

/**
 * Extrae lista de operadores únicos presentes en los registros
 */
export function getUniqueOperators(records: ProductionRecord[]): string[] {
  const ops = new Set<string>();
  records.forEach(r => {
    const op = (r.DesOperador || '').trim();
    if (op) ops.add(op);
  });
  return Array.from(ops).sort();
}

/**
 * Extrae lista de máquinas únicas operadas por un operador específico
 */
export function getMachinesOperatedBy(records: ProductionRecord[], operatorName: string): string[] {
  const machines = new Set<string>();
  const targetOp = operatorName.trim().toLowerCase();
  records.forEach(r => {
    if ((r.DesOperador || '').trim().toLowerCase() === targetOp) {
      const m = (r.MaqDes || '').trim();
      if (m) machines.add(m);
    }
  });
  return Array.from(machines).sort();
}

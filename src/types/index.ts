export type ShiftType = 'DIA' | 'NOCHE';

// Base de turno oficial: 11.25 horas = 675 minutos
export const SHIFT_BASE_MINUTES = 675;
export const SHIFT_BASE_HOURS = 11.25;

export interface ProductionRecord {
  id: string;
  odtcod: string;             // OP (Orden de Producción)
  ODTDESCRIP: string;         // Descripción de producto
  DesOperador: string;        // Operador
  MaqDes: string;             // Máquina
  Proceso: string;            // Evento (Producción, Ajuste, Mantenimiento, etc.)
  FECHAINI: string;           // Fecha de inicio (YYYY-MM-DD o DD/MM/YYYY)
  HORAINI: string;            // Hora de inicio (HH:MM o HH:MM:SS)
  FECHAFIN: string;           // Fecha de finalización
  HORAFIN: string;            // Hora de finalización
  minutos: number;            // Duración total del evento en minutos
  PliegosParc: number;        // Cantidad buena
  pliegosparcmal: number;     // Cantidad defectuosa (mermas / scrap)
  turno?: ShiftType;          // Turno calculado automáticamente (Día o Noche)
  fechaTurno?: string;        // Fecha operativa del turno (YYYY-MM-DD): eventos nocturnos de madrugada pertenecen al día anterior
}

export interface GlobalPlantSettings {
  globalQualityTargetPct: number;   // Meta de calidad general (% pliegos buenos para todas las máquinas)
  globalWarningThresholdPct: number;// Umbral de alerta general (% eficiencia mínima antes de advertencia)
}

export interface MachineTarget {
  id: string;
  maqDes: string;             // Nombre exacto de la máquina
  targetUndMin: number;       // Meta en "und x minuto" (solo tiempo en producción)
  targetQualityPct?: number;  // Meta de calidad (% pliegos buenos)
  targetAvailabilityPct?: number; // Meta de disponibilidad (% tiempo en producción)
  warningThresholdPct?: number;// Umbral amarillo (ej. 85%)
  active: boolean;
  notes?: string;
  // Meta por turno base de 11.25h (675 min): targetUndMin * 675
  metaTurnoBase?: number;
}

export interface FilterState {
  turno: 'TODOS' | 'DIA' | 'NOCHE' | 'ACTUAL';
  maqDes: string;            // 'TODAS' o máquina específica
  desOperador: string;       // 'TODOS' o operador específico
  proceso: string;           // 'TODOS' o proceso específico
  fechaInicio: string;       // YYYY-MM-DD o ''
  fechaFin: string;          // YYYY-MM-DD o ''
  busqueda: string;          // Búsqueda libre en OP o producto
}

export interface AuditReportData {
  reportTitle: string;
  reportDate: string;
  auditorName: string;
  shiftAudited: string;
  summary: {
    totalRecords: number;
    totalPliegosBuenos: number;
    totalPliegosDefectuosos: number;
    totalMinutos: number;
    totalMinutosProduccion: number;
    promedioUndMin: number;
    eficienciaGlobalVelocidad: number;
    tasaCalidadGlobal: number;
    disponibilidadGlobal: number;
    oeeGlobal: number;
  };
  machineMetrics: Array<{
    maqDes: string;
    metaUndMin: number;
    metaTurnoBase: number;
    realUndMin: number;
    eficienciaVelocidad: number;
    pliegosBuenos: number;
    pliegosMalos: number;
    tasaCalidad: number;
    minutosProd: number;
    minutosParada: number;
    disponibilidad: number;
  }>;
  operatorMetrics: Array<{
    operador: string;
    pliegosBuenos: number;
    pliegosMalos: number;
    minutosProd: number;
    realUndMin: number;
    eficienciaVelocidad: number;
    tasaCalidad: number;
  }>;
  topEvents: Array<{
    proceso: string;
    minutos: number;
    porcentaje: number;
    esProduccion: boolean;
  }>;
}

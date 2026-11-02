import { ShiftType } from '../types';

/**
 * Normaliza una fecha (string o Date) a formato YYYY-MM-DD en UTC.
 */
export function normalizeDateToYMD(dateInput: string | Date | undefined | null): string {
  if (!dateInput) {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  if (dateInput instanceof Date) {
    if (!isNaN(dateInput.getTime())) {
      const y = dateInput.getFullYear();
      const m = String(dateInput.getMonth() + 1).padStart(2, '0');
      const d = String(dateInput.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const s = String(dateInput).trim();
  // YYYY-MM-DD o ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10);
  }

  // DD/MM/YYYY o DD-MM-YYYY
  const slashMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY/MM/DD
  const reverseSlashMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (reverseSlashMatch) {
    const year = reverseSlashMatch[1];
    const month = reverseSlashMatch[2].padStart(2, '0');
    const day = reverseSlashMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Fallback si no coincide
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return s.substring(0, 10);
}

/**
 * Extrae horas y minutos de un campo de hora (string, Date o número decimal de Excel).
 */
export function parseHoursAndMinutes(timeInput: string | Date | number | undefined | null): { hours: number; minutes: number } {
  if (timeInput === undefined || timeInput === null || timeInput === '') {
    return { hours: 7, minutes: 0 };
  }

  if (timeInput instanceof Date) {
    if (!isNaN(timeInput.getTime())) {
      return { hours: timeInput.getHours(), minutes: timeInput.getMinutes() };
    }
    return { hours: 7, minutes: 0 };
  }

  if (typeof timeInput === 'number') {
    // Si viene como fracción decimal de día de Excel (ej: 0.5 = 12:00, 0.7916 = ~19:00)
    if (timeInput >= 0 && timeInput <= 1) {
      const totalMinutesInDay = Math.round(timeInput * 24 * 60);
      const hours = Math.floor(totalMinutesInDay / 60) % 24;
      const minutes = totalMinutesInDay % 60;
      return { hours, minutes };
    }
    return { hours: Math.floor(timeInput) % 24, minutes: 0 };
  }

  const clean = String(timeInput).trim();
  if (!clean) return { hours: 7, minutes: 0 };

  // Formato con fecha completa ISO o similar: "2026-10-31 01:15:00"
  if (clean.includes('T') || (clean.includes('-') && clean.includes(':')) || (clean.includes('/') && clean.includes(':'))) {
    const parsedDate = new Date(clean.replace(' ', 'T'));
    if (!isNaN(parsedDate.getTime())) {
      return { hours: parsedDate.getHours(), minutes: parsedDate.getMinutes() };
    }
  }

  // Extracción de formato HH:MM o HH:MM:SS (con soporte opcional AM/PM)
  const isPM = /pm/i.test(clean);
  const isAM = /am/i.test(clean);
  const timeMatch = clean.match(/(\d{1,2}):(\d{1,2})/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    if (isNaN(hours)) hours = 7;
    const cleanMin = isNaN(minutes) ? 0 : minutes;

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return { hours: hours % 24, minutes: cleanMin };
  }

  const singleNum = parseInt(clean, 10);
  if (!isNaN(singleNum)) {
    return { hours: singleNum % 24, minutes: 0 };
  }

  return { hours: 7, minutes: 0 };
}

/**
 * Determina el turno correspondiente según la hora de inicio del evento:
 * - Turno Día: de 07:00 a 18:59 (420 a 1139 min desde medianoche)
 * - Turno Noche: de 19:00 a 06:59 (1140 a 1439 min y 0 a 419 min)
 */
export function getShiftFromTime(timeInput: string | Date | number | undefined | null): ShiftType {
  const { hours, minutes } = parseHoursAndMinutes(timeInput);
  const totalMin = hours * 60 + minutes;
  return getShiftFromMinutes(totalMin);
}

/**
 * Evalúa el turno a partir de minutos acumulados desde medianoche (0 - 1439).
 * Turno Día: 07:00 (420 min) a 18:59 (1139 min)
 * Turno Noche: 19:00 (1140 min) a 06:59 (419 min)
 */
export function getShiftFromMinutes(totalMinutes: number): ShiftType {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  // 07:00 = 420 minutos, 18:59 = 1139 minutos
  if (m >= 420 && m <= 1139) {
    return 'DIA';
  }
  return 'NOCHE';
}

/**
 * Calcula la Fecha Operativa del Turno (fechaTurno) y el turno ('DIA' o 'NOCHE').
 * 
 * Regla de negocio industrial fundamental:
 * - Turno Día (07:00 a 18:59): Pertenece al mismo día calendario.
 * - Turno Noche (19:00 a 06:59):
 *    * Si inició entre 19:00 y 23:59: Pertenece a la fecha del día que inició (Día D).
 *    * Si inició entre 00:00 y 06:59: Pertenece al turno noche que comenzó la noche anterior (Día D - 1).
 * 
 * Ejemplo:
 * Un evento que inició el 31 de octubre a la 01:15 AM pertenece al Turno Noche del 30 de octubre.
 * Un evento que inició el 02 de noviembre a las 19:00 pertenece al Turno Noche del 02 de noviembre.
 * Un evento que inició el 03 de noviembre a las 05:30 pertenece al Turno Noche del 02 de noviembre.
 */
export function getRecordShiftInfo(
  fechaIni: string | Date | undefined | null,
  horaIni: string | Date | number | undefined | null
): { turno: ShiftType; fechaTurno: string } {
  const baseYmd = normalizeDateToYMD(fechaIni);
  const { hours, minutes } = parseHoursAndMinutes(horaIni);
  const totalMin = hours * 60 + minutes;
  const turno = getShiftFromMinutes(totalMin);

  if (turno === 'DIA') {
    return { turno: 'DIA', fechaTurno: baseYmd };
  }

  // Turno Noche:
  // Si la hora es de madrugada (00:00 a 06:59, es decir hours < 7),
  // pertenece al turno noche del día calendario anterior (D - 1).
  if (hours < 7) {
    const parts = baseYmd.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    
    // Usar Date en UTC para restar 1 día de forma exacta y sin desfaces de huso horario
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() - 1);
    
    const prevY = dt.getUTCFullYear();
    const prevM = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const prevD = String(dt.getUTCDate()).padStart(2, '0');
    const fechaAnterior = `${prevY}-${prevM}-${prevD}`;

    return { turno: 'NOCHE', fechaTurno: fechaAnterior };
  }

  // Si inició entre 19:00 y 23:59, la fecha del turno noche es el día actual
  return { turno: 'NOCHE', fechaTurno: baseYmd };
}

/**
 * Retorna solo la fecha operativa del turno para un registro.
 */
export function getOperationalDate(
  fechaIni: string | Date | undefined | null,
  horaIni: string | Date | number | undefined | null
): string {
  return getRecordShiftInfo(fechaIni, horaIni).fechaTurno;
}

/**
 * Retorna el turno actual basado en la hora real del sistema.
 */
export function getCurrentSystemShift(): ShiftType {
  return getShiftFromTime(new Date());
}

/**
 * Calcula el tiempo restante hasta el próximo cambio de turno automático.
 * Próximo cambio a las 19:00:00 (Noche) o a las 07:00:00 (Día).
 */
export function getNextShiftCountdown(): {
  nextShift: ShiftType;
  hoursLeft: number;
  minutesLeft: number;
  secondsLeft: number;
  targetTimeStr: string;
} {
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  // Turno Día: 07:00 (420 min) a 18:59 (1139 min)
  const isDia = currentTotalMinutes >= 420 && currentTotalMinutes <= 1139;
  const nextShift: ShiftType = isDia ? 'NOCHE' : 'DIA';

  const target = new Date(now);
  if (isDia) {
    // Próximo cambio a las 19:00:00 de hoy (Turno Noche)
    target.setHours(19, 0, 0, 0);
  } else {
    // Próximo cambio a las 07:00:00 (Turno Día)
    if (currentTotalMinutes >= 1140) {
      // Estamos después de las 19:00, el cambio a Turno Día es mañana a las 07:00:00
      target.setDate(target.getDate() + 1);
    }
    // Si estamos entre 00:00 y 06:59, el cambio es hoy a las 07:00:00
    target.setHours(7, 0, 0, 0);
  }

  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const hoursLeft = Math.floor(totalSeconds / 3600);
  const minutesLeft = Math.floor((totalSeconds % 3600) / 60);
  const secondsLeft = totalSeconds % 60;

  return {
    nextShift,
    hoursLeft,
    minutesLeft,
    secondsLeft,
    targetTimeStr: isDia ? '19:00 (Noche)' : '07:00 (Día)',
  };
}

export function formatShiftLabel(shift: ShiftType): string {
  return shift === 'DIA' ? 'Turno Día (07:00 - 18:59)' : 'Turno Noche (19:00 - 06:59)';
}

import { ShiftType } from '../types';

/**
 * Determina el turno correspondiente según una hora o momento.
 * Turno Día: 07:05 a 18:59:59 (425 min a 1139 min desde medianoche)
 * Turno Noche: 19:00 a 07:04:59 (1140 min a 23:59:59 y 00:00:00 a 424 min)
 * 
 * Regla de negocio: Producciones que cierran poco más de las 7 (hasta las 07:04)
 * corresponden al Turno Noche que inició la noche anterior.
 */
export function getShiftFromTime(timeInput: string | Date | number | undefined | null): ShiftType {
  if (!timeInput && timeInput !== 0) return 'DIA';

  let hours: number = 7;
  let minutes: number = 5;

  if (timeInput instanceof Date) {
    if (!isNaN(timeInput.getTime())) {
      hours = timeInput.getHours();
      minutes = timeInput.getMinutes();
    }
  } else if (typeof timeInput === 'number') {
    // Si viene como fracción decimal de día de Excel (ej: 0.295 = ~07:04)
    if (timeInput >= 0 && timeInput <= 1) {
      const totalMinutesInDay = Math.round(timeInput * 24 * 60);
      hours = Math.floor(totalMinutesInDay / 60) % 24;
      minutes = totalMinutesInDay % 60;
    } else {
      hours = Math.floor(timeInput);
    }
  } else if (typeof timeInput === 'string') {
    const clean = timeInput.trim();
    if (!clean) return 'DIA';

    // Formato con fecha completa ISO o similar: "2026-10-31 07:03:00" o "2026-10-31T07:03:00"
    if (clean.includes('T') || (clean.includes('-') && clean.includes(':')) || (clean.includes('/') && clean.includes(':'))) {
      const parsedDate = new Date(clean.replace(' ', 'T'));
      if (!isNaN(parsedDate.getTime())) {
        hours = parsedDate.getHours();
        minutes = parsedDate.getMinutes();
        return getShiftFromMinutes(hours * 60 + minutes);
      }
    }

    // Extracción de formato HH:MM o HH:MM:SS
    const isPM = /pm/i.test(clean);
    const isAM = /am/i.test(clean);
    const timeMatch = clean.match(/(\d{1,2}):(\d{1,2})/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      if (isNaN(hours)) hours = 7;
      if (isNaN(minutes)) minutes = 5;

      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
    } else {
      const singleNum = parseInt(clean, 10);
      if (!isNaN(singleNum)) {
        hours = singleNum;
        minutes = 0;
      }
    }
  }

  const totalMin = hours * 60 + minutes;
  return getShiftFromMinutes(totalMin);
}

/**
 * Evalúa el turno a partir de minutos acumulados desde medianoche (0 - 1439).
 * Turno Día: 07:05 (425 min) a 18:59 (1139 min)
 * Turno Noche: 19:00 (1140 min) a 07:04 (424 min)
 */
export function getShiftFromMinutes(totalMinutes: number): ShiftType {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  
  if (m >= 425 && m <= 1139) {
    return 'DIA';
  }
  
  return 'NOCHE';
}

/**
 * Retorna el turno actual basado en la hora real del sistema.
 */
export function getCurrentSystemShift(): ShiftType {
  return getShiftFromTime(new Date());
}

/**
 * Calcula el tiempo restante hasta el próximo cambio de turno automático.
 * Próximo cambio a las 19:00:00 (Noche) o a las 07:05:00 (Día).
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

  const isDia = currentTotalMinutes >= 425 && currentTotalMinutes <= 1139;
  const nextShift: ShiftType = isDia ? 'NOCHE' : 'DIA';

  const target = new Date(now);
  if (isDia) {
    // Próximo cambio a las 19:00:00 de hoy (Turno Noche)
    target.setHours(19, 0, 0, 0);
  } else {
    // Próximo cambio a las 07:05:00 (Turno Día)
    if (currentTotalMinutes >= 1140) {
      // Estamos después de las 19:00, el cambio a Turno Día es mañana a las 07:05:00
      target.setDate(target.getDate() + 1);
    }
    // Si estamos entre 00:00 y 07:04, el cambio es hoy a las 07:05:00
    target.setHours(7, 5, 0, 0);
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
    targetTimeStr: isDia ? '19:00 (Noche)' : '07:05 (Día)',
  };
}

export function formatShiftLabel(shift: ShiftType): string {
  return shift === 'DIA' ? 'Turno Día (07:05 - 18:59)' : 'Turno Noche (19:00 - 07:04)';
}

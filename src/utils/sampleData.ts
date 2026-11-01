import { ProductionRecord, MachineTarget } from '../types';

// Inicialmente vacío: sin datos de demo precargados
export const INITIAL_MACHINE_TARGETS: MachineTarget[] = [];

export const RAW_SAMPLE_RECORDS: Omit<ProductionRecord, 'id' | 'turno'>[] = [];

export function getInitialProductionRecords(): ProductionRecord[] {
  return [];
}

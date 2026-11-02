import React, { useState, useEffect, useMemo } from 'react';
import { ProductionRecord, MachineTarget, FilterState, ShiftType, GlobalPlantSettings } from './types';
import { 
  INITIAL_MACHINE_TARGETS, 
  getInitialProductionRecords 
} from './utils/sampleData';
import { 
  DEFAULT_PRODUCTION_EVENTS, 
  filterProductionRecords, 
  syncMachinesFromRecords 
} from './utils/metrics';
import { getCurrentSystemShift, getShiftFromTime, getRecordShiftInfo } from './utils/shifts';

import { Header } from './components/Header';
import { FiltersBar } from './components/FiltersBar';
import { DashboardView } from './components/DashboardView';
import { ComparativeView } from './components/ComparativeView';
import { MachineTargetsView } from './components/MachineTargetsView';
import { AuditReportsView } from './components/AuditReportsView';
import { DataManagementView } from './components/DataManagementView';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'comparative' | 'targets' | 'reports' | 'data'>('dashboard');
  const [currentSystemShift, setCurrentSystemShift] = useState<ShiftType>(getCurrentSystemShift());

  // Parámetros Generales de Planta (Meta de Calidad y Umbral de Alerta universales para todas las máquinas)
  const [globalSettings, setGlobalSettings] = useState<GlobalPlantSettings>(() => {
    try {
      const saved = localStorage.getItem('oee_global_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.globalQualityTargetPct === 'number' && typeof parsed?.globalWarningThresholdPct === 'number') {
          return parsed;
        }
      }
    } catch {
      // Ignorar error
    }
    return { globalQualityTargetPct: 98.0, globalWarningThresholdPct: 85.0 };
  });

  // Registros de producción: Inicia completamente vacío hasta que se cargue el Excel
  const [records, setRecords] = useState<ProductionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('oee_production_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Descartar si era data de la demo anterior
        if (Array.isArray(parsed) && parsed.length > 0 && !parsed.some(r => String(r.id).startsWith('rec-'))) {
          // Re-evaluar turno con los límites exactos: Día 07:00 - 18:59, Noche 19:00 - 06:59
          return parsed.map((r: ProductionRecord) => {
            const shiftInfo = getRecordShiftInfo(r.FECHAINI, r.HORAINI);
            return {
              ...r,
              turno: shiftInfo.turno,
              fechaTurno: r.fechaTurno || shiftInfo.fechaTurno,
            };
          });
        }
      }
    } catch {
      // Ignorar error
    }
    return [];
  });

  // Lista de nombres de máquinas que el usuario eliminó
  const [deletedMachines, setDeletedMachines] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('oee_deleted_machines');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignorar error
    }
    return [];
  });

  // Metas por máquina: Inicia vacío o con lo guardado (descartando demo)
  const [machineTargets, setMachineTargets] = useState<MachineTarget[]>(() => {
    try {
      const saved = localStorage.getItem('oee_machine_targets');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Descartar si eran las máquinas de prueba por defecto
        if (Array.isArray(parsed) && parsed.length > 0 && !parsed.some(m => String(m.id).startsWith('target-'))) {
          return parsed;
        }
      }
    } catch {
      // Ignorar error
    }
    return [];
  });

  // Eventos de producción configurados
  const [productionEvents, setProductionEvents] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('oee_production_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignorar error
    }
    return DEFAULT_PRODUCTION_EVENTS;
  });

  // Estado global de filtros (sin línea de producción)
  const [filters, setFilters] = useState<FilterState>({
    turno: 'TODOS',
    maqDes: 'TODAS',
    desOperador: 'TODOS',
    proceso: 'TODOS',
    fechaInicio: '',
    fechaFin: '',
    busqueda: '',
  });

  // Persistir registros en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('oee_production_records', JSON.stringify(records));
    } catch (e) {
      console.warn('No se pudo guardar registros en localStorage', e);
    }
  }, [records]);

  // Persistir metas en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('oee_machine_targets', JSON.stringify(machineTargets));
    } catch (e) {
      console.warn('No se pudo guardar metas en localStorage', e);
    }
  }, [machineTargets]);

  // Persistir máquinas eliminadas en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('oee_deleted_machines', JSON.stringify(deletedMachines));
    } catch (e) {
      console.warn('No se pudo guardar deletedMachines en localStorage', e);
    }
  }, [deletedMachines]);

  // Persistir eventos en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('oee_production_events', JSON.stringify(productionEvents));
    } catch (e) {
      console.warn('No se pudo guardar eventos en localStorage', e);
    }
  }, [productionEvents]);

  // Persistir parámetros globales en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('oee_global_settings', JSON.stringify(globalSettings));
    } catch (e) {
      console.warn('No se pudo guardar globalSettings en localStorage', e);
    }
  }, [globalSettings]);

  // Chequeo de cambio de turno automático cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      const shift = getCurrentSystemShift();
      if (shift !== currentSystemShift) {
        setCurrentSystemShift(shift);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentSystemShift]);

  // Filtrado de registros en memoria: EXCLUYE automáticamente cualquier registro de máquinas eliminadas
  const filteredRecords = useMemo(() => {
    return filterProductionRecords(records, filters, machineTargets, currentSystemShift);
  }, [records, filters, machineTargets, currentSystemShift]);

  const handleResetTargets = () => {
    setDeletedMachines([]);
    setMachineTargets([]);
    setProductionEvents(DEFAULT_PRODUCTION_EVENTS);
    try {
      localStorage.removeItem('oee_deleted_machines');
      localStorage.setItem('oee_machine_targets', JSON.stringify([]));
    } catch (e) {
      console.warn(e);
    }
  };

  // ACTUALIZACIÓN GLOBAL DE PARÁMETROS: Aplica a todas las máquinas de la planta
  const handleUpdateGlobalSettings = (newSettings: GlobalPlantSettings) => {
    setGlobalSettings(newSettings);
    // Propagar inmediatamente el nuevo umbral y meta de calidad a todas las máquinas existentes
    setMachineTargets(prev => prev.map(m => ({
      ...m,
      targetQualityPct: newSettings.globalQualityTargetPct,
      warningThresholdPct: newSettings.globalWarningThresholdPct,
    })));
  };

  // ELIMINACIÓN DE MÁQUINA DE FORMA DIRECTA Y DEFINITIVA
  const handleDeleteMachine = (id: string, maqDes: string) => {
    const lowerName = maqDes.trim().toLowerCase();
    
    const nextDeleted = deletedMachines.includes(lowerName)
      ? deletedMachines
      : [...deletedMachines, lowerName];
    setDeletedMachines(nextDeleted);

    const nextTargets = machineTargets.filter(
      t => t.id !== id && t.maqDes.trim().toLowerCase() !== lowerName
    );
    setMachineTargets(nextTargets);

    try {
      localStorage.setItem('oee_deleted_machines', JSON.stringify(nextDeleted));
      localStorage.setItem('oee_machine_targets', JSON.stringify(nextTargets));
    } catch (e) {
      console.warn(e);
    }
  };

  // RESTAURAR MÁQUINA ELIMINADA
  const handleRestoreMachine = (machineName: string) => {
    const lowerName = machineName.trim().toLowerCase();
    const nextDeleted = deletedMachines.filter(m => m !== lowerName);
    setDeletedMachines(nextDeleted);

    const deletedSet = new Set(nextDeleted);
    const synced = syncMachinesFromRecords(records, machineTargets, deletedSet, globalSettings);
    setMachineTargets(synced);

    try {
      localStorage.setItem('oee_deleted_machines', JSON.stringify(nextDeleted));
      localStorage.setItem('oee_machine_targets', JSON.stringify(synced));
    } catch (e) {
      console.warn(e);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      turno: 'TODOS',
      maqDes: 'TODAS',
      desOperador: 'TODOS',
      proceso: 'TODOS',
      fechaInicio: '',
      fechaFin: '',
      busqueda: '',
    });
  };

  const handleSelectMachineFilter = (machineName: string) => {
    setFilters(prev => ({
      ...prev,
      maqDes: machineName,
    }));
  };

  const handleSelectOperatorFilter = (operatorName: string) => {
    setFilters(prev => ({
      ...prev,
      desOperador: operatorName,
    }));
  };

  // AL CARGAR EXCEL: Sincroniza automáticamente las máquinas del archivo Excel con los parámetros globales
  const handleUpdateRecords = (newRecords: ProductionRecord[]) => {
    setRecords(newRecords);
    const deletedSet = new Set(deletedMachines.map(m => m.toLowerCase()));
    const synced = syncMachinesFromRecords(newRecords, machineTargets, deletedSet, globalSettings);
    setMachineTargets(synced);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* INDICADOR DE MODO SIN CONEXIÓN */}
      <OfflineIndicator />
      
      {/* CABECERA PRINCIPAL CON INDICADOR DE TURNO EN VIVO */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenUpload={() => setActiveTab('data')}
        totalRecordsCount={records.length}
      />

      {/* BARRA DE FILTROS (Visible en Dashboard y Reportes cuando hay registros) */}
      {(activeTab === 'dashboard' || activeTab === 'reports') && records.length > 0 && (
        <FiltersBar
          filters={filters}
          onFilterChange={setFilters}
          machineTargets={machineTargets}
          records={records}
          currentSystemShift={currentSystemShift}
          onResetFilters={handleResetFilters}
          totalFilteredCount={filteredRecords.length}
          totalOriginalCount={records.length}
        />
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            records={filteredRecords}
            machineTargets={machineTargets}
            filters={filters}
            onFilterChange={setFilters}
            onNavigateToTargets={() => setActiveTab('targets')}
            onNavigateToData={() => setActiveTab('data')}
            onSelectMachineFilter={handleSelectMachineFilter}
            onSelectOperatorFilter={handleSelectOperatorFilter}
            globalSettings={globalSettings}
            currentSystemShift={currentSystemShift}
          />
        )}

        {activeTab === 'comparative' && (
          <ComparativeView
            records={records}
            machineTargets={machineTargets}
            globalSettings={globalSettings}
            currentSystemShift={currentSystemShift}
            onNavigateToTargets={() => setActiveTab('targets')}
            onNavigateToData={() => setActiveTab('data')}
          />
        )}

        {activeTab === 'targets' && (
          <MachineTargetsView
            machineTargets={machineTargets}
            onSaveTargets={setMachineTargets}
            onResetTargets={handleResetTargets}
            onDeleteMachine={handleDeleteMachine}
            deletedMachines={deletedMachines}
            onRestoreMachine={handleRestoreMachine}
            productionEvents={productionEvents}
            onUpdateProductionEvents={setProductionEvents}
            records={records}
            globalSettings={globalSettings}
            onUpdateGlobalSettings={handleUpdateGlobalSettings}
          />
        )}

        {activeTab === 'reports' && (
          <AuditReportsView
            records={filteredRecords}
            machineTargets={machineTargets}
            filters={filters}
            onFilterChange={setFilters}
            currentSystemShift={currentSystemShift}
            onNavigateToData={() => setActiveTab('data')}
            globalSettings={globalSettings}
          />
        )}

        {activeTab === 'data' && (
          <DataManagementView
            records={records}
            onUpdateRecords={handleUpdateRecords}
          />
        )}
      </main>

      {/* PIE DE PÁGINA INDUSTRIAL */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">Sistema de Eficiencia & OEE</span>
            <span className="text-slate-600">|</span>
            <span>Turno Día: 07:00 a 18:59 • Turno Noche: 19:00 a 06:59</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <span>Base estándar de turno: 11.25 horas (675 minutos) • Asignación por hora inicio (HORAINI)</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

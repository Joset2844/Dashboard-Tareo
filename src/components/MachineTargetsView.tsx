import React, { useState, useEffect } from 'react';
import { 
  Settings2, 
  Plus, 
  Save, 
  RotateCcw, 
  Check, 
  Info, 
  Trash2, 
  Sliders, 
  RefreshCw, 
  Clock, 
  AlertTriangle, 
  Undo2,
  ShieldCheck,
  Gauge
} from 'lucide-react';
import { MachineTarget, ProductionRecord, SHIFT_BASE_HOURS, SHIFT_BASE_MINUTES, GlobalPlantSettings } from '../types';
import { syncMachinesFromRecords } from '../utils/metrics';

interface MachineTargetsViewProps {
  machineTargets: MachineTarget[];
  onSaveTargets: (newTargets: MachineTarget[]) => void;
  onResetTargets: () => void;
  onDeleteMachine: (id: string, machineName: string) => void;
  deletedMachines: string[];
  onRestoreMachine: (machineName: string) => void;
  productionEvents: string[];
  onUpdateProductionEvents: (events: string[]) => void;
  records: ProductionRecord[];
  globalSettings: GlobalPlantSettings;
  onUpdateGlobalSettings: (newSettings: GlobalPlantSettings) => void;
}

export const MachineTargetsView: React.FC<MachineTargetsViewProps> = ({
  machineTargets,
  onSaveTargets,
  onResetTargets,
  onDeleteMachine,
  deletedMachines,
  onRestoreMachine,
  productionEvents,
  onUpdateProductionEvents,
  records,
  globalSettings,
  onUpdateGlobalSettings,
}) => {
  const [targets, setTargets] = useState<MachineTarget[]>(machineTargets);
  const [newEventInput, setNewEventInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isAddingMachine, setIsAddingMachine] = useState(false);

  // Estados locales para los parámetros globales de planta
  const [globalQuality, setGlobalQuality] = useState<number>(globalSettings.globalQualityTargetPct);
  const [globalWarning, setGlobalWarning] = useState<number>(globalSettings.globalWarningThresholdPct);
  const [globalSavedSuccess, setGlobalSavedSuccess] = useState(false);

  // Modal in-app de confirmación de eliminación
  const [machineToDelete, setMachineToDelete] = useState<{ id: string; maqDes: string } | null>(null);

  // Sincronizar estado local cuando machineTargets cambie
  useEffect(() => {
    setTargets(machineTargets);
  }, [machineTargets]);

  useEffect(() => {
    setGlobalQuality(globalSettings.globalQualityTargetPct);
    setGlobalWarning(globalSettings.globalWarningThresholdPct);
  }, [globalSettings]);

  // Nuevo registro de máquina
  const [newMachine, setNewMachine] = useState<Partial<MachineTarget>>({
    maqDes: '',
    targetUndMin: 120,
    active: true,
    notes: '',
  });

  const handleFieldChange = (id: string, field: keyof MachineTarget, value: any) => {
    setTargets(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'targetUndMin') {
          updated.metaTurnoBase = Number(value) * SHIFT_BASE_MINUTES;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleSaveAllTargets = () => {
    const updated = targets.map(t => ({
      ...t,
      targetQualityPct: globalQuality,
      warningThresholdPct: globalWarning,
      metaTurnoBase: Number(t.targetUndMin) * SHIFT_BASE_MINUTES,
    }));
    onSaveTargets(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Guardar y aplicar parámetros globales a TODAS las máquinas
  const handleApplyGlobalSettings = () => {
    const newSettings: GlobalPlantSettings = {
      globalQualityTargetPct: Number(globalQuality) || 98.0,
      globalWarningThresholdPct: Number(globalWarning) || 85.0,
    };
    onUpdateGlobalSettings(newSettings);

    // Actualizar todas las máquinas en memoria para que reflejen inmediatamente el nuevo estándar
    const updated = targets.map(t => ({
      ...t,
      targetQualityPct: newSettings.globalQualityTargetPct,
      warningThresholdPct: newSettings.globalWarningThresholdPct,
    }));
    setTargets(updated);
    onSaveTargets(updated);

    setGlobalSavedSuccess(true);
    setTimeout(() => setGlobalSavedSuccess(false), 3000);
  };

  const handleAddNewMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachine.maqDes?.trim()) return;

    const undMin = Number(newMachine.targetUndMin) || 100;
    const created: MachineTarget = {
      id: `custom-target-${Date.now()}`,
      maqDes: newMachine.maqDes.trim(),
      targetUndMin: undMin,
      targetQualityPct: globalQuality,
      targetAvailabilityPct: 75,
      warningThresholdPct: globalWarning,
      active: true,
      notes: newMachine.notes || '',
      metaTurnoBase: undMin * SHIFT_BASE_MINUTES,
    };

    const updated = [...targets, created];
    setTargets(updated);
    onSaveTargets(updated);
    setIsAddingMachine(false);
    setNewMachine({
      maqDes: '',
      targetUndMin: 120,
      active: true,
      notes: '',
    });
  };

  const handleConfirmDelete = () => {
    if (!machineToDelete) return;
    const { id, maqDes } = machineToDelete;
    onDeleteMachine(id, maqDes);
    setTargets(prev => prev.filter(t => t.id !== id));
    setMachineToDelete(null);
  };

  const handleSyncFromExcel = () => {
    const deletedSet = new Set(deletedMachines.map(m => m.toLowerCase()));
    const synced = syncMachinesFromRecords(records, targets, deletedSet, {
      globalQualityTargetPct: globalQuality,
      globalWarningThresholdPct: globalWarning,
    });
    setTargets(synced);
    onSaveTargets(synced);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newEventInput.trim();
    if (val && !productionEvents.includes(val)) {
      const updated = [...productionEvents, val];
      onUpdateProductionEvents(updated);
      setNewEventInput('');
    }
  };

  const handleRemoveEvent = (eventToRemove: string) => {
    if (productionEvents.length <= 1) return;
    const updated = productionEvents.filter(e => e !== eventToRemove);
    onUpdateProductionEvents(updated);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. SECCIÓN DE PARÁMETROS GLOBALES DE PLANTA (META CALIDAD Y UMBRAL ALERTA) */}
      <div className="bg-white border-2 border-blue-500/30 rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-blue-100 text-blue-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Parámetros Generales de Planta
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  Aplica a todas las máquinas
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Al cambiar el umbral de alerta o la meta de calidad, se actualiza automáticamente el estándar para todas las máquinas de la planta.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyGlobalSettings}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded text-white shadow-xs transition-all cursor-pointer ${
              globalSavedSuccess ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {globalSavedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>¡Aplicado a todas las máquinas!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Aplicar a todas las máquinas</span>
              </>
            )}
          </button>
        </div>

        {/* Formulario de Parámetros Globales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs">
          
          {/* Meta Calidad General */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3.5 space-y-1.5">
            <label className="block text-emerald-900 font-bold uppercase tracking-wider text-[11px]">
              Meta de Calidad General (% mínima)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min={50}
                max={100}
                value={globalQuality}
                onChange={(e) => setGlobalQuality(Number(e.target.value))}
                className="w-24 bg-white border border-emerald-300 rounded px-2.5 py-1.5 font-mono font-bold text-base text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="font-mono text-emerald-700 font-bold text-sm">%</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Porcentaje mínimo aceptable de pliegos conformes (<code className="bg-emerald-100/80 px-1 py-0.2 rounded font-mono">PliegosParc / Total</code>).
            </p>
          </div>

          {/* Umbral de Alerta General */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3.5 space-y-1.5">
            <label className="block text-amber-900 font-bold uppercase tracking-wider text-[11px]">
              Umbral de Alerta General (% de Eficiencia)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min={50}
                max={98}
                value={globalWarning}
                onChange={(e) => setGlobalWarning(Number(e.target.value))}
                className="w-24 bg-white border border-amber-300 rounded px-2.5 py-1.5 font-mono font-bold text-base text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="font-mono text-amber-700 font-bold text-sm">%</span>
            </div>
            <p className="text-[11px] text-amber-800">
              Límite inferior para marcar una máquina en <strong className="text-amber-900">Alerta (Amarillo)</strong> o <strong className="text-rose-900">Crítico (Rojo)</strong> si está por debajo.
            </p>
          </div>

          {/* Base de Turno Informada */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1.5">
            <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              Base de Turno Oficial
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base text-slate-800">
                {SHIFT_BASE_HOURS} Horas
              </span>
              <span className="text-xs text-slate-500 font-mono">({SHIFT_BASE_MINUTES} min)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Todas las metas en <strong>und/min</strong> se multiplican por {SHIFT_BASE_MINUTES} min para proyectar el volumen por turno.
            </p>
          </div>

        </div>
      </div>

      {/* SECCIÓN DE MÁQUINAS EXCLUIDAS / ELIMINADAS (CON OPCIÓN DE RESTAURAR) */}
      {deletedMachines.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Máquinas eliminadas ({deletedMachines.length}) — Sus registros están excluidos del sistema:
            </span>
            <span className="text-[10px] text-amber-700">Puedes restaurarlas en cualquier momento</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {deletedMachines.map(mName => (
              <div 
                key={mName}
                className="inline-flex items-center gap-1.5 bg-white border border-amber-300 text-slate-800 px-2.5 py-1 rounded text-xs shadow-2xs"
              >
                <span className="font-medium capitalize">{mName}</span>
                <button
                  type="button"
                  onClick={() => onRestoreMachine(mName)}
                  className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-medium text-[11px] hover:underline cursor-pointer ml-1"
                  title="Restaurar máquina y volver a computar sus registros"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Restaurar</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. SECCIÓN: TABLA DE METAS ESPECÍFICAS DE VELOCIDAD POR MÁQUINA */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-600" />
              Metas Específicas de Velocidad por Máquina ({targets.length})
            </h3>
            <span className="text-xs text-slate-500">
              Cada máquina tiene su propia meta de velocidad operativa en <strong>und x minuto</strong> (tiempo neto de producción).
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSyncFromExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors cursor-pointer"
              title="Detectar e incorporar automáticamente cualquier máquina presente en los registros del Excel"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sincronizar desde Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddingMachine(!isAddingMachine)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Máquina</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAllTargets}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded text-white shadow-xs transition-all cursor-pointer ${
                savedSuccess ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>¡Guardado!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Velocidades</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal / Formulario para agregar máquina */}
        {isAddingMachine && (
          <form onSubmit={handleAddNewMachine} className="bg-slate-50 border border-slate-300 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Nueva Máquina en Planta
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Nombre de Máquina / MaqDes *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Heidelberg CD 102"
                  value={newMachine.maqDes}
                  onChange={(e) => setNewMachine({ ...newMachine, maqDes: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Meta Velocidad (und x min) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={2000}
                  value={newMachine.targetUndMin}
                  onChange={(e) => setNewMachine({ ...newMachine, targetUndMin: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-500">
                  Meta turno ({SHIFT_BASE_HOURS}h): {((Number(newMachine.targetUndMin) || 0) * SHIFT_BASE_MINUTES).toLocaleString()} und
                </span>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Parámetros que heredará:</label>
                <div className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded p-1.5">
                  Calidad: <strong>{globalQuality}%</strong> • Alerta: <strong>{globalWarning}%</strong> (Generales)
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingMachine(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 rounded cursor-pointer"
              >
                Guardar Máquina
              </button>
            </div>
          </form>
        )}

        {/* Tabla Editable */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Máquina (MaqDes)</th>
                <th className="py-2.5 px-3 text-center">
                  <span className="text-blue-700">Meta Velocidad (und x min)</span>
                  <span className="block text-[10px] font-normal text-slate-500">Específica de máquina</span>
                </th>
                <th className="py-2.5 px-3 text-center">
                  <span className="text-emerald-700">Meta Turno ({SHIFT_BASE_HOURS}h)</span>
                  <span className="block text-[10px] font-normal text-slate-500">und/min × {SHIFT_BASE_MINUTES} min</span>
                </th>
                <th className="py-2.5 px-3 text-center">
                  <span>Meta Calidad</span>
                  <span className="block text-[10px] font-normal text-blue-600 font-medium">General Planta</span>
                </th>
                <th className="py-2.5 px-3 text-center">
                  <span>Umbral Alerta</span>
                  <span className="block text-[10px] font-normal text-amber-600 font-medium">General Planta</span>
                </th>
                <th className="py-2.5 px-3">Notas Técnicas</th>
                <th className="py-2.5 px-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {targets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No hay máquinas configuradas. Haz clic en "Sincronizar desde Excel" o "Agregar Máquina".
                  </td>
                </tr>
              ) : (
                targets.map((target) => {
                  const shiftExpected = Number(target.targetUndMin) * SHIFT_BASE_MINUTES;
                  return (
                    <tr key={target.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <input
                          type="text"
                          value={target.maqDes}
                          onChange={(e) => handleFieldChange(target.id, 'maqDes', e.target.value)}
                          className="bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1.5 py-1 w-full font-semibold text-slate-800"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1 justify-center">
                          <input
                            type="number"
                            min={1}
                            max={3000}
                            value={target.targetUndMin}
                            onChange={(e) => handleFieldChange(target.id, 'targetUndMin', Number(e.target.value))}
                            className="w-20 text-center font-mono font-bold text-blue-700 bg-blue-50/50 border border-blue-200 focus:bg-white focus:border-blue-500 rounded py-1"
                          />
                          <span className="text-[10px] text-slate-400 font-mono">u/m</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-800 bg-emerald-50/30">
                        {shiftExpected.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">und</span>
                      </td>

                      {/* Meta Calidad (General) */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {globalQuality}%
                        </span>
                      </td>

                      {/* Umbral Alerta (General) */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {globalWarning}%
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          placeholder="Especificaciones o notas..."
                          value={target.notes || ''}
                          onChange={(e) => handleFieldChange(target.id, 'notes', e.target.value)}
                          className="bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1.5 py-1 w-full text-slate-500 text-[11px]"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setMachineToDelete({ id: target.id, maqDes: target.maqDes })}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded transition-colors cursor-pointer"
                          title={`Eliminar ${target.maqDes} y excluir sus registros`}
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. SECCIÓN: DEFINICIÓN DE EVENTOS QUE CUENTAN COMO TIEMPO DE PRODUCCIÓN */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600" />
            Configuración de Eventos Productivos (Fórmula "und x minuto")
          </h3>
          <p className="text-xs text-slate-500">
            Define los nombres de eventos en la columna <code className="text-slate-700">Proceso</code> que deben sumarse como tiempo productivo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {productionEvents.map((eventName) => (
            <div 
              key={eventName}
              className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-2.5 py-1 rounded-md font-medium"
            >
              <span>{eventName}</span>
              <button
                type="button"
                onClick={() => handleRemoveEvent(eventName)}
                className="text-emerald-600 hover:text-emerald-900 cursor-pointer ml-1 text-xs"
                title="Quitar de la lista de eventos productivos"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddEvent} className="flex items-center gap-2 max-w-md pt-2">
          <input
            type="text"
            placeholder="Añadir otro nombre de evento productivo..."
            value={newEventInput}
            onChange={(e) => setNewEventInput(e.target.value)}
            className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded px-3 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors cursor-pointer"
          >
            Añadir
          </button>
        </form>
      </div>

      {/* MODAL IN-APP DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {machineToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-full bg-rose-100 text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    ¿Eliminar máquina "{machineToDelete.maqDes}"?
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Esta acción quitará la máquina de la lista de metas activas.
                  </p>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded p-3 text-xs text-rose-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Consecuencia inmediata:</strong>
                  <p className="text-rose-800 text-[11px] mt-0.5">
                    Todos los registros asociados a <strong>"{machineToDelete.maqDes}"</strong> serán automáticamente <strong>excluidos del dashboard</strong>, de los cálculos de velocidad (und/min) y de los reportes de auditoría.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMachineToDelete(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded shadow-xs transition-colors cursor-pointer"
                >
                  Sí, Eliminar Máquina
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

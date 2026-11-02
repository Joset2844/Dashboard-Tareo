import React, { useState } from 'react';
import { 
  FileCheck, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  Calendar, 
  Sun, 
  Moon, 
  Cpu,
  Activity,
  Filter,
  RotateCcw,
  Upload,
  Clock
} from 'lucide-react';
import { ProductionRecord, MachineTarget, FilterState, SHIFT_BASE_HOURS, SHIFT_BASE_MINUTES, GlobalPlantSettings } from '../types';
import { calculateConsolidatedMetrics } from '../utils/metrics';
import { exportAuditReportToExcel } from '../utils/excelHandler';
import { exportAuditReportToPdf } from '../utils/pdfExporter';

interface AuditReportsViewProps {
  records: ProductionRecord[];
  machineTargets: MachineTarget[];
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  currentSystemShift: 'DIA' | 'NOCHE';
  onNavigateToData?: () => void;
  globalSettings?: GlobalPlantSettings;
}

export const AuditReportsView: React.FC<AuditReportsViewProps> = ({
  records,
  machineTargets,
  filters,
  onFilterChange,
  currentSystemShift,
  onNavigateToData,
  globalSettings,
}) => {
  const [reportTitle, setReportTitle] = useState('Informe de Auditoría Interna de Eficiencia Operacional & OEE');
  const [auditorName, setAuditorName] = useState('Ing. José Tejera - Control de Gestión & Auditoría');
  const [auditNotes, setAuditNotes] = useState(`Auditoría de cumplimiento de velocidad estándar (und/min) y metas basadas en turnos de ${SHIFT_BASE_HOURS}h (${SHIFT_BASE_MINUTES} min).`);

  // Cálculo de métricas pasando estrictamente el filtro de máquina activo y los parámetros globales
  const { totals, machineMetrics, operatorMetrics, topEvents } = calculateConsolidatedMetrics(
    records,
    machineTargets,
    undefined,
    filters.maqDes,
    globalSettings
  );

  const compliantMachines = machineMetrics.filter(m => m.status === 'green');

  // Listas para los selectores de filtro
  const availableMachines = machineTargets.map(m => m.maqDes).sort();
  const machineSet = new Set(machineTargets.map(m => m.maqDes.trim().toLowerCase()));
  const availableOperators = Array.from(
    new Set(
      records
        .filter(r => machineSet.has((r.MaqDes || '').trim().toLowerCase()))
        .map(r => r.DesOperador)
        .filter(Boolean)
    )
  ).sort();

  const availableProcesses = Array.from(
    new Set(
      records
        .filter(r => machineSet.has((r.MaqDes || '').trim().toLowerCase()))
        .map(r => r.Proceso)
        .filter(Boolean)
    )
  ).sort();

  const shiftLabel = 
    filters.turno === 'TODOS' ? 'Ambos Turnos (Día y Noche)' :
    filters.turno === 'DIA' ? 'Turno Día (07:00 - 18:59)' :
    filters.turno === 'NOCHE' ? 'Turno Noche (19:00 - 06:59)' :
    `Turno Actual en Curso (${currentSystemShift})`;

  const machineLabel = filters.maqDes !== 'TODAS' ? filters.maqDes : 'Todas las máquinas';
  const operatorLabel = filters.desOperador !== 'TODOS' ? filters.desOperador : 'Todos los operadores';
  const processLabel = filters.proceso !== 'TODOS' ? filters.proceso : 'Todos los eventos';

  const dateLabel = filters.fechaInicio || filters.fechaFin
    ? `${filters.fechaInicio || 'Inicio'} hasta ${filters.fechaFin || 'Presente'}`
    : 'Todo el periodo registrado';

  const handleResetFilters = () => {
    onFilterChange({
      turno: 'TODOS',
      maqDes: 'TODAS',
      desOperador: 'TODOS',
      proceso: 'TODOS',
      fechaInicio: '',
      fechaFin: '',
      busqueda: '',
    });
  };

  const handleExportExcel = () => {
    exportAuditReportToExcel({
      reportTitle,
      auditorName,
      shiftFilter: shiftLabel,
      machineFilter: machineLabel,
      operatorFilter: operatorLabel,
      processFilter: processLabel,
      dateFilter: dateLabel,
      records,
      machineMetrics,
      operatorMetrics,
      topEvents,
      kpis: totals,
      globalSettings,
    });
  };

  const handleExportPdf = () => {
    exportAuditReportToPdf({
      reportTitle,
      auditorName,
      shiftFilter: shiftLabel,
      machineFilter: machineLabel,
      operatorFilter: operatorLabel,
      processFilter: processLabel,
      dateFilter: dateLabel,
      kpis: totals,
      machineMetrics,
      operatorMetrics,
      topEvents,
      globalSettings,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Si no hay ningún registro en todo el sistema
  if (records.length === 0 && filters.maqDes === 'TODAS' && filters.desOperador === 'TODOS' && filters.turno === 'TODOS') {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center max-w-xl mx-auto shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <FileCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">
            No hay datos de producción cargados
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Para emitir un reporte de auditoría y evaluar el cumplimiento de metas (und/min), sube primero tu archivo de Excel en la sección de datos.
          </p>
        </div>
        {onNavigateToData && (
          <button
            type="button"
            onClick={onNavigateToData}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded shadow-xs cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Ir a Cargar Archivo Excel</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* PANEL DE CONTROL DEL REPORTE */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded bg-blue-100 text-blue-700">
                <FileCheck className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Módulo de Auditorías Internas & Reportes Oficiales
                </h2>
                <p className="text-xs text-slate-500">
                  Base estándar de evaluación: <strong>{SHIFT_BASE_HOURS} horas ({SHIFT_BASE_MINUTES} minutos)</strong> por turno.
                </p>
              </div>
            </div>
          </div>

          {/* Botones de Exportación */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-600 text-white shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded bg-rose-700 hover:bg-rose-600 text-white shadow-xs transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Descargar PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* FILTROS INTEGRADOS DIRECTOS PARA LA AUDITORÍA */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              Filtros Activos para la Auditoría:
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] text-rose-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restablecer Filtros</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
            {/* Filtro Turno */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Turno:</label>
              <select
                value={filters.turno}
                onChange={(e) => onFilterChange({ ...filters, turno: e.target.value as any })}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="TODOS">Todos los turnos</option>
                <option value="DIA">Turno Día (07:00 - 18:59)</option>
                <option value="NOCHE">Turno Noche (19:00 - 06:59)</option>
                <option value="ACTUAL">En curso ({currentSystemShift})</option>
              </select>
            </div>

            {/* Filtro Máquina */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Máquina Auditada:</label>
              <select
                value={filters.maqDes}
                onChange={(e) => onFilterChange({ ...filters, maqDes: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
              >
                <option value="TODAS">Todas las máquinas ({availableMachines.length})</option>
                {availableMachines.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Filtro Operador */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Operador Auditado:</label>
              <select
                value={filters.desOperador}
                onChange={(e) => onFilterChange({ ...filters, desOperador: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
              >
                <option value="TODOS">Todos los operadores ({availableOperators.length})</option>
                {availableOperators.map(op => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </div>

            {/* Filtro Proceso/Evento */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Evento / Proceso:</label>
              <select
                value={filters.proceso}
                onChange={(e) => onFilterChange({ ...filters, proceso: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
              >
                <option value="TODOS">Todos los eventos</option>
                {availableProcesses.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Filtro Fechas */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Periodo (Desde/Hasta):</label>
              <div className="flex gap-1">
                <input
                  type="date"
                  value={filters.fechaInicio}
                  onChange={(e) => onFilterChange({ ...filters, fechaInicio: e.target.value })}
                  className="w-1/2 bg-white border border-slate-300 rounded px-1.5 py-1 text-[11px] font-mono text-slate-800"
                />
                <input
                  type="date"
                  value={filters.fechaFin}
                  onChange={(e) => onFilterChange({ ...filters, fechaFin: e.target.value })}
                  className="w-1/2 bg-white border border-slate-300 rounded px-1.5 py-1 text-[11px] font-mono text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Campos Configurables del Dictamen de Auditoría */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Título del Documento:</label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Auditor Responsable / Certificador:</label>
            <input
              type="text"
              value={auditorName}
              onChange={(e) => setAuditorName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Observaciones / Alcance de la Auditoría:</label>
            <input
              type="text"
              value={auditNotes}
              onChange={(e) => setAuditNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* VISTA PREVIA DEL DOCUMENTO DE AUDITORÍA */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xs space-y-6 print:shadow-none print:border-none print:p-0">
        
        {/* Cabecera del Certificado de Auditoría */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-[11px] font-bold tracking-widest text-blue-600 uppercase">
              DEPARTAMENTO DE CONTROL DE CALIDAD Y GESTIÓN OPERATIVA
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {reportTitle}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Registro de Auditoría de Eficiencia Industrial | Base de cálculo: {SHIFT_BASE_HOURS}h ({SHIFT_BASE_MINUTES} min) de producción
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-600">
            <div><strong>Emisión:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
            <div><strong>Turno:</strong> <span className="font-semibold text-slate-800">{shiftLabel}</span></div>
            <div><strong>Máquina:</strong> <span className="font-semibold text-blue-800">{machineLabel}</span></div>
            <div><strong>Operador:</strong> <span className="font-semibold text-slate-800">{operatorLabel}</span></div>
          </div>
        </div>

        {/* DICTAMEN EJECUTIVO Y CERTIFICACIÓN */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded p-3.5 text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Cumplimiento Metas
            </span>
            <div className="text-2xl font-black font-mono text-slate-900">
              {compliantMachines.length} / {machineMetrics.length}
            </div>
            <span className="text-[11px] text-slate-500">
              {machineMetrics.length > 0 ? Math.round((compliantMachines.length / machineMetrics.length) * 100) : 0}% máquinas en meta
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-3.5 text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Eficiencia Global Vel.
            </span>
            <div className={`text-2xl font-black font-mono ${
              totals.eficienciaGlobalVelocidad >= 95 ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {totals.eficienciaGlobalVelocidad}%
            </div>
            <span className="text-[11px] text-slate-500">
              Prom: {totals.velocidadPromedioReal} und/min
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-3.5 text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Calidad Conforme
            </span>
            <div className="text-2xl font-black font-mono text-emerald-700">
              {totals.tasaCalidadGlobal}%
            </div>
            <span className="text-[11px] text-rose-600">
              {totals.totalPliegosMalos.toLocaleString()} pliegos scrap
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-3.5 text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              OEE del Periodo
            </span>
            <div className="text-2xl font-black font-mono text-blue-700">
              {totals.oeeGlobal}%
            </div>
            <span className="text-[11px] text-slate-500">
              Disponibilidad: {totals.disponibilidadGlobal}%
            </span>
          </div>
        </div>

        {/* 1. SECCIÓN: AUDITORÍA DE RENDIMIENTO POR MÁQUINA */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              1. Verificación de Metas de Velocidad por Máquina ({machineMetrics.length})
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Filtro: {machineLabel} | Base: {SHIFT_BASE_MINUTES} min
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2.5">Máquina</th>
                  <th className="py-2 px-2.5 text-right">Meta (und/min)</th>
                  <th className="py-2 px-2.5 text-right">Meta Turno (675m)</th>
                  <th className="py-2 px-2.5 text-right">Vel. Real (und/min)</th>
                  <th className="py-2 px-2.5 text-right">Eficiencia (%)</th>
                  <th className="py-2 px-2.5 text-right">Calidad (%)</th>
                  <th className="py-2 px-2.5 text-right">T. Producción</th>
                  <th className="py-2 px-2.5 text-right">Pliegos Buenos</th>
                  <th className="py-2 px-2.5 text-center">Dictamen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {machineMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400">
                      No se encontraron registros de máquinas que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  machineMetrics.map((m) => (
                    <tr key={m.maqDes} className="hover:bg-slate-50">
                      <td className="py-2 px-2.5 font-semibold text-slate-900">{m.maqDes}</td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-700">{m.metaUndMin} u/m</td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-800">{m.metaTurnoBase.toLocaleString()}</td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">{m.realUndMin} u/m</td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold">
                        <span className={
                          m.eficienciaVelocidad >= 95 ? 'text-emerald-700' : m.eficienciaVelocidad >= m.warningThreshold ? 'text-amber-700' : 'text-rose-700'
                        }>
                          {m.eficienciaVelocidad}%
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-700">{m.tasaCalidad}%</td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-600">{m.minutosProd} min</td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-800">{m.pliegosBuenos.toLocaleString()}</td>
                      <td className="py-2 px-2.5 text-center font-bold text-[10px]">
                        {m.recordsCount === 0 ? (
                          <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            SIN REGISTROS
                          </span>
                        ) : m.status === 'green' ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            CONFORME
                          </span>
                        ) : m.status === 'yellow' ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            OBSERVACIÓN
                          </span>
                        ) : (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            NO CUMPLE
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. SECCIÓN: AUDITORÍA DE RENDIMIENTO DE OPERADORES */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              2. Registro de Desempeño Operativo por Operador ({operatorMetrics.length})
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Filtro: {operatorLabel}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2.5">Operador</th>
                  <th className="py-2 px-2.5">Máquinas Asignadas</th>
                  <th className="py-2 px-2.5 text-right">Vel. Media (und/min)</th>
                  <th className="py-2 px-2.5 text-right">Meta Turno (675m)</th>
                  <th className="py-2 px-2.5 text-right">Eficiencia (%)</th>
                  <th className="py-2 px-2.5 text-right">Calidad (%)</th>
                  <th className="py-2 px-2.5 text-right">Mermas (Scrap)</th>
                  <th className="py-2 px-2.5 text-right">Pliegos Buenos</th>
                  <th className="py-2 px-2.5 text-right">Tiempo en Prod.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {operatorMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400">
                      No se encontraron registros de operadores que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  operatorMetrics.map((op) => (
                    <tr key={op.operador} className="hover:bg-slate-50">
                      <td className="py-2 px-2.5 font-semibold text-slate-900">{op.operador}</td>
                      <td className="py-2 px-2.5 text-slate-600 max-w-[200px] truncate">{op.maquinas.join(', ')}</td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-800">{op.realUndMin} u/m</td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-600">{op.metaTurnoBaseEstimada.toLocaleString()}</td>
                      <td className="py-2 px-2.5 text-right font-mono font-semibold text-slate-800">{op.eficienciaVelocidad}%</td>
                      <td className="py-2 px-2.5 text-right font-mono text-emerald-700 font-semibold">{op.tasaCalidad}%</td>
                      <td className="py-2 px-2.5 text-right font-mono text-rose-600">
                        {op.pliegosMalos.toLocaleString()} ({op.tasaMerma}%)
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">{op.pliegosBuenos.toLocaleString()}</td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-600">{op.minutosProd} min</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. SECCIÓN: DESGLOSE DE NO CONFORMIDADES Y PARADAS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              3. Causas Principales de Parada e Inactividad Auditadas ({topEvents.length})
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Filtro: {processLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {topEvents.length === 0 ? (
              <div className="col-span-4 py-4 text-center text-slate-400 text-xs">
                No hay eventos o paradas registradas para los filtros aplicados.
              </div>
            ) : (
              topEvents.slice(0, 4).map((e) => (
                <div key={e.proceso} className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs">
                  <span className="font-semibold text-slate-800 block truncate" title={e.proceso}>
                    {e.proceso}
                  </span>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="font-mono text-sm font-bold text-amber-700">{e.minutos} min</span>
                    <span className="text-[11px] text-slate-500">{e.porcentaje}% del tiempo</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {e.esProduccion ? 'Producción' : 'Parada'} • Ocurrencias: {e.veces} veces
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. SECCIÓN: CONFORMIDAD Y FIRMAS PARA AUDITORÍAS INTERNAS */}
        <div className="pt-6 border-t border-slate-200 space-y-6">
          <div className="text-xs text-slate-600 italic">
            El presente informe certifica los datos de velocidad de producción y calidad extraídos del sistema. Las metas están calibradas sobre la base de 11.25 horas (675 minutos) de jornada, computando estrictamente los pliegos conformes obtenidos en las horas netas de producción de cada máquina.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-800">{auditorName}</div>
              <div className="text-[11px] text-slate-500">Auditor Interno de Operaciones</div>
            </div>

            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-800">Supervisor de Turno ({filters.turno === 'NOCHE' ? 'Noche' : 'Día'})</div>
              <div className="text-[11px] text-slate-500">Jefatura de Turno de Planta</div>
            </div>

            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-800">Dirección de Producción & Calidad</div>
              <div className="text-[11px] text-slate-500">Aprobación de Control Interno</div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  Calendar, 
  Clock, 
  Cpu, 
  FileSpreadsheet, 
  FileText, 
  Filter, 
  Printer, 
  RotateCcw, 
  Search, 
  User, 
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Layers,
  ChevronRight,
  Upload
} from 'lucide-react';
import { ProductionRecord, MachineTarget, ShiftType } from '../types';
import { 
  EventFilterState, 
  filterRecordsForEvent, 
  calculateEventAnalysis 
} from '../utils/eventAnalysisUtils';
import { exportEventAnalysisToExcel } from '../utils/excelHandler';
import { exportEventAnalysisToPdf, printEventAnalysisPdf } from '../utils/pdfExporter';

interface EventAnalysisViewProps {
  records: ProductionRecord[];
  machineTargets: MachineTarget[];
  currentSystemShift: ShiftType;
  productionEvents: string[];
  onNavigateToData?: () => void;
}

export const EventAnalysisView: React.FC<EventAnalysisViewProps> = ({
  records,
  machineTargets,
  currentSystemShift,
  productionEvents,
  onNavigateToData,
}) => {
  // Lista de todos los procesos/eventos presentes en los datos
  const availableEvents = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.Proceso && r.Proceso.trim()) {
        set.add(r.Proceso.trim());
      }
    });
    return Array.from(set).sort();
  }, [records]);

  // Evento preseleccionado por defecto (preferir la parada con mayor tiempo si existe, o el primer evento)
  const defaultEvent = useMemo(() => {
    if (availableEvents.length === 0) return 'TODOS';
    // Buscar un evento que no sea Producción para destacar paradas
    const nonProd = availableEvents.find(e => !e.toLowerCase().includes('producc'));
    return nonProd || availableEvents[0] || 'TODOS';
  }, [availableEvents]);

  // Estado de Filtros de Evento
  const [filters, setFilters] = useState<EventFilterState>({
    proceso: defaultEvent,
    fechaInicio: '',
    fechaFin: '',
    maquinas: ['TODAS'],
    operador: 'TODOS',
    turno: 'TODOS',
    busqueda: '',
  });

  // Campos de metadatos del Reporte de Auditoría
  const [reportTitle, setReportTitle] = useState('Informe de Auditoría y Duración por Evento');
  const [auditorName, setAuditorName] = useState('Dpto. Control de Gestión & Auditoría');
  const [activeTabSubView, setActiveTabSubView] = useState<'all' | 'machines' | 'operators' | 'dates' | 'log'>('all');

  // Listas para los selectores
  const availableMachines = useMemo(() => {
    const list = Array.from(new Set(records.map(r => r.MaqDes).filter(Boolean))).sort();
    return list;
  }, [records]);

  const availableOperators = useMemo(() => {
    const list = Array.from(new Set(records.map(r => r.DesOperador).filter(Boolean))).sort();
    return list;
  }, [records]);

  // Estadísticas rápidas de cada evento para badges
  const eventMinutesMap = useMemo(() => {
    const map = new Map<string, { minutos: number; veces: number }>();
    records.forEach(r => {
      const p = (r.Proceso || '').trim();
      if (!p) return;
      const current = map.get(p) || { minutos: 0, veces: 0 };
      current.minutos += Number(r.minutos) || 0;
      current.veces += 1;
      map.set(p, current);
    });
    return map;
  }, [records]);

  // Registros del periodo global (para calcular % de incidencia sobre planta)
  const allRecordsInPeriod = useMemo(() => {
    return records.filter(r => {
      const recFecha = r.fechaTurno || r.FECHAINI;
      if (filters.fechaInicio && recFecha < filters.fechaInicio) return false;
      if (filters.fechaFin && recFecha > filters.fechaFin) return false;
      return true;
    });
  }, [records, filters.fechaInicio, filters.fechaFin]);

  // Filtrado específico para el evento seleccionado
  const filteredRecords = useMemo(() => {
    return filterRecordsForEvent(records, filters, currentSystemShift);
  }, [records, filters, currentSystemShift]);

  // Análisis consolidado
  const summary = useMemo(() => {
    return calculateEventAnalysis(
      filteredRecords,
      allRecordsInPeriod,
      filters.proceso,
      productionEvents
    );
  }, [filteredRecords, allRecordsInPeriod, filters.proceso, productionEvents]);

  // Acciones de filtros rápidos por fecha
  const handleDateShortcut = (preset: 'all' | 'today' | 'yesterday' | '7days' | 'month') => {
    const today = new Date().toISOString().split('T')[0];
    if (preset === 'all') {
      setFilters(prev => ({ ...prev, fechaInicio: '', fechaFin: '' }));
    } else if (preset === 'today') {
      setFilters(prev => ({ ...prev, fechaInicio: today, fechaFin: today }));
    } else if (preset === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yDate = d.toISOString().split('T')[0];
      setFilters(prev => ({ ...prev, fechaInicio: yDate, fechaFin: yDate }));
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const pastDate = d.toISOString().split('T')[0];
      setFilters(prev => ({ ...prev, fechaInicio: pastDate, fechaFin: today }));
    } else if (preset === 'month') {
      const d = new Date();
      const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      setFilters(prev => ({ ...prev, fechaInicio: firstDay, fechaFin: today }));
    }
  };

  const handleToggleMachine = (maq: string) => {
    if (maq === 'TODAS') {
      setFilters(prev => ({ ...prev, maquinas: ['TODAS'] }));
      return;
    }

    setFilters(prev => {
      const current = prev.maquinas.filter(m => m !== 'TODAS');
      if (current.includes(maq)) {
        const next = current.filter(m => m !== maq);
        return { ...prev, maquinas: next.length === 0 ? ['TODAS'] : next };
      } else {
        return { ...prev, maquinas: [...current, maq] };
      }
    });
  };

  const handleResetFilters = () => {
    setFilters({
      proceso: availableEvents[0] || 'TODOS',
      fechaInicio: '',
      fechaFin: '',
      maquinas: ['TODAS'],
      operador: 'TODOS',
      turno: 'TODOS',
      busqueda: '',
    });
  };

  // Exportar a Excel
  const handleExportExcel = () => {
    const machinesLabel = filters.maquinas.includes('TODAS') 
      ? 'Todas las máquinas' 
      : filters.maquinas.join(', ');
    const dateRangeLabel = filters.fechaInicio && filters.fechaFin
      ? `${filters.fechaInicio} a ${filters.fechaFin}`
      : filters.fechaInicio
      ? `Desde ${filters.fechaInicio}`
      : filters.fechaFin
      ? `Hasta ${filters.fechaFin}`
      : 'Histórico Completo';

    exportEventAnalysisToExcel({
      eventName: filters.proceso,
      filtersDescription: {
        dateRange: dateRangeLabel,
        machines: machinesLabel,
        operator: filters.operador,
        shift: filters.turno,
      },
      summary,
    });
  };

  // Exportar a PDF
  const handleExportPdf = () => {
    const machinesLabel = filters.maquinas.includes('TODAS') 
      ? 'Todas las máquinas' 
      : filters.maquinas.join(', ');
    const dateRangeLabel = filters.fechaInicio && filters.fechaFin
      ? `${filters.fechaInicio} a ${filters.fechaFin}`
      : filters.fechaInicio
      ? `Desde ${filters.fechaInicio}`
      : filters.fechaFin
      ? `Hasta ${filters.fechaFin}`
      : 'Histórico Completo';

    exportEventAnalysisToPdf({
      reportTitle,
      auditorName,
      eventName: filters.proceso,
      dateFilter: dateRangeLabel,
      machineFilter: machinesLabel,
      operatorFilter: filters.operador,
      shiftFilter: filters.turno,
      summary,
    });
  };

  // Imprimir formato oficial de PDF
  const handlePrint = () => {
    const machinesLabel = filters.maquinas.includes('TODAS') 
      ? 'Todas las máquinas' 
      : filters.maquinas.join(', ');
    const dateRangeLabel = filters.fechaInicio && filters.fechaFin
      ? `${filters.fechaInicio} a ${filters.fechaFin}`
      : filters.fechaInicio
      ? `Desde ${filters.fechaInicio}`
      : filters.fechaFin
      ? `Hasta ${filters.fechaFin}`
      : 'Histórico Completo';

    printEventAnalysisPdf({
      reportTitle,
      auditorName,
      eventName: filters.proceso,
      dateFilter: dateRangeLabel,
      machineFilter: machinesLabel,
      operatorFilter: filters.operador,
      shiftFilter: filters.turno,
      summary,
    });
  };

  // Si no hay datos cargados
  if (records.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center max-w-xl mx-auto shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">
            No hay registros de eventos disponibles
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Carga tu archivo de producción en la sección de datos para analizar eventos, tiempos de parada, duraciones y generar informes de auditoría.
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
      
      {/* PANEL DE CONTROL Y FILTROS DEL EVENTO (Oculto en Impresión) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5 no-print">
        
        {/* Cabecera del Panel */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Análisis & Auditoría por Evento y Paradas
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  Control Temporal
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Consulta cuánto tiempo ocurrió un evento específico desglosado por máquinas, operadores y fechas.
              </p>
            </div>
          </div>

          {/* Botones de Exportación Oficial */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-600 text-white shadow-xs transition-colors cursor-pointer"
              title="Descargar libro Excel con hojas de resumen, desglose de máquinas, operadores y bitácora"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded bg-rose-700 hover:bg-rose-600 text-white shadow-xs transition-colors cursor-pointer"
              title="Descargar dictamen oficial en PDF con tablas y firmas"
            >
              <FileText className="w-4 h-4" />
              <span>Descargar PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-white shadow-xs transition-colors cursor-pointer"
              title="Imprimir formato oficial idéntico al PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Formato PDF</span>
            </button>
          </div>
        </div>

        {/* 1. SELECTOR PRINCIPAL DE EVENTO */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-indigo-600" />
              Selecciona el Evento / Proceso a Auditar:
            </label>
            <span className="text-[11px] text-slate-500 font-mono">
              {availableEvents.length} eventos registrados en planta
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1.5 bg-slate-50 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setFilters(prev => ({ ...prev, proceso: 'TODOS' }))}
              className={`p-2 rounded text-left transition-all text-xs font-medium border cursor-pointer ${
                filters.proceso === 'TODOS'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="font-bold truncate">TODOS LOS EVENTOS</div>
              <div className={`text-[10px] mt-0.5 ${filters.proceso === 'TODOS' ? 'text-indigo-200' : 'text-slate-400'}`}>
                {records.length} registros
              </div>
            </button>

            {availableEvents.map(evt => {
              const stats = eventMinutesMap.get(evt) || { minutos: 0, veces: 0 };
              const isSelected = filters.proceso === evt;
              return (
                <button
                  key={evt}
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, proceso: evt }))}
                  className={`p-2 rounded text-left transition-all text-xs border cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={`${evt} - ${stats.minutos} min (${Math.round(stats.minutos / 60)}h) en ${stats.veces} registros`}
                >
                  <div className="font-semibold truncate">{evt}</div>
                  <div className={`text-[10px] flex items-center justify-between mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                    <span>{stats.minutos} min</span>
                    <span>{stats.veces} reg</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. FILTROS COMBINADOS: FECHAS, MÁQUINAS, OPERADOR Y TURNO */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-100 text-xs">
          
          {/* Rango de Fechas */}
          <div className="md:col-span-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> Rango de Fechas:
              </label>
              <div className="flex gap-1 text-[10px]">
                <button 
                  type="button" 
                  onClick={() => handleDateShortcut('all')}
                  className="text-indigo-600 hover:underline cursor-pointer"
                >
                  Todo
                </button>
                <span>•</span>
                <button 
                  type="button" 
                  onClick={() => handleDateShortcut('today')}
                  className="text-indigo-600 hover:underline cursor-pointer"
                >
                  Hoy
                </button>
                <span>•</span>
                <button 
                  type="button" 
                  onClick={() => handleDateShortcut('7days')}
                  className="text-indigo-600 hover:underline cursor-pointer"
                >
                  7D
                </button>
                <span>•</span>
                <button 
                  type="button" 
                  onClick={() => handleDateShortcut('month')}
                  className="text-indigo-600 hover:underline cursor-pointer"
                >
                  Mes
                </button>
              </div>
            </div>

            <div className="flex gap-1.5">
              <input
                type="date"
                value={filters.fechaInicio}
                onChange={(e) => setFilters(prev => ({ ...prev, fechaInicio: e.target.value }))}
                className="w-1/2 bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-mono text-[11px] text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                title="Fecha inicio"
              />
              <input
                type="date"
                value={filters.fechaFin}
                onChange={(e) => setFilters(prev => ({ ...prev, fechaFin: e.target.value }))}
                className="w-1/2 bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-mono text-[11px] text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                title="Fecha fin"
              />
            </div>
          </div>

          {/* Máquinas Específicas (Multiselección) */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="font-semibold text-slate-700 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-slate-500" /> Máquina(s) a Consultar:
            </label>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded">
              <button
                type="button"
                onClick={() => handleToggleMachine('TODAS')}
                className={`px-2 py-0.5 text-[11px] rounded font-medium cursor-pointer transition ${
                  filters.maquinas.includes('TODAS')
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Todas
              </button>
              {availableMachines.map(m => {
                const isSelected = !filters.maquinas.includes('TODAS') && filters.maquinas.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleToggleMachine(m)}
                    className={`px-2 py-0.5 text-[11px] rounded font-medium cursor-pointer transition truncate max-w-[160px] ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                    title={m}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Operador Específico */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="font-semibold text-slate-700 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500" /> Operador Específico:
            </label>
            <select
              value={filters.operador}
              onChange={(e) => setFilters(prev => ({ ...prev, operador: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate"
            >
              <option value="TODOS">Todos los operadores ({availableOperators.length})</option>
              {availableOperators.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>

          {/* Turno y Reset */}
          <div className="md:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" /> Turno:
              </label>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                title="Restablecer filtros"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
            <select
              value={filters.turno}
              onChange={(e) => setFilters(prev => ({ ...prev, turno: e.target.value as any }))}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="TODOS">Todos los turnos</option>
              <option value="DIA">Turno Día (07:00 - 18:59)</option>
              <option value="NOCHE">Turno Noche (19:00 - 06:59)</option>
              <option value="ACTUAL">En curso ({currentSystemShift})</option>
            </select>
          </div>

        </div>

        {/* Metadatos Editables para la Certificación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Título del Informe:</label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-800 focus:bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Auditor Responsable / Certificador:</label>
            <input
              type="text"
              value={auditorName}
              onChange={(e) => setAuditorName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-800 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

      </div>

      {/* DOCUMENTO OFICIAL / REPORTE DE AUDITORÍA (Estilizado para pantalla y @media print) */}
      <div id="audit-event-document" className="print-document bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-6 print:shadow-none print:border-none print:p-0">
        
        {/* Cabecera del Documento */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-widest text-indigo-700 uppercase">
                INFORME OFICIAL DE AUDITORÍA DE PARADAS Y TIEMPOS OPERATIVOS
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                summary.esProduccion 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {summary.esProduccion ? 'TIEMPO PRODUCTIVO' : 'PARADA / INACTIVIDAD'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              {filters.proceso === 'TODOS' ? 'Análisis Consolidado de Todos los Eventos' : `Evento Auditado: "${filters.proceso}"`}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Registro estricto de horas, minutos e impacto por máquina, operador y fecha según HORAINI de los eventos.
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-600 bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded border sm:border-none border-slate-200 w-full sm:w-auto">
            <div><strong>Emisión:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
            <div><strong>Auditor:</strong> <span className="font-semibold text-slate-800">{auditorName}</span></div>
            <div><strong>Turno:</strong> <span className="font-semibold text-slate-800">{filters.turno === 'TODOS' ? 'Todos' : filters.turno}</span></div>
            <div>
              <strong>Periodo:</strong>{' '}
              <span className="font-mono text-indigo-700 font-bold">
                {filters.fechaInicio && filters.fechaFin 
                  ? `${filters.fechaInicio} al ${filters.fechaFin}` 
                  : filters.fechaInicio 
                  ? `Desde ${filters.fechaInicio}` 
                  : filters.fechaFin 
                  ? `Hasta ${filters.fechaFin}` 
                  : 'Todo el histórico'}
              </span>
            </div>
          </div>
        </div>

        {/* TARJETAS DE KPIS PRINCIPALES DEL EVENTO */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Tiempo Total */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Tiempo Total Ocurrido
            </span>
            <div className="text-2xl font-black font-mono text-indigo-900">
              {summary.totalMinutos.toLocaleString()} min
            </div>
            <span className="text-xs font-semibold text-indigo-600 mt-0.5 block">
              {summary.totalHoras.toLocaleString()} horas acumuladas
            </span>
          </div>

          {/* Frecuencia / Ocurrencias */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Frecuencia / Ocurrencias
            </span>
            <div className="text-2xl font-black font-mono text-slate-900">
              {summary.totalOcurrencias} veces
            </div>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Registros en el periodo
            </span>
          </div>

          {/* Duración Media */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Duración Promedio
            </span>
            <div className="text-2xl font-black font-mono text-amber-700">
              {summary.duracionPromedioMin} min
            </div>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Por cada incidencia
            </span>
          </div>

          {/* % Impacto Planta */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Impacto en la Planta
            </span>
            <div className="text-2xl font-black font-mono text-rose-700">
              {summary.porcentajeSobreTotalPlanta}%
            </div>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Del tiempo total registrado
            </span>
          </div>
        </div>

        {/* NAVEGACIÓN DE SUB-PESTAÑAS DE DESGLOSE (Sólo en pantalla) */}
        <div className="no-print border-b border-slate-200">
          <nav className="flex space-x-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTabSubView('all')}
              className={`pb-2.5 transition border-b-2 cursor-pointer ${
                activeTabSubView === 'all'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Vista Completa (Todas las Secciones)
            </button>
            <button
              type="button"
              onClick={() => setActiveTabSubView('machines')}
              className={`pb-2.5 transition border-b-2 cursor-pointer ${
                activeTabSubView === 'machines'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              1. Desglose por Máquina ({summary.maquinasImpacto.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTabSubView('operators')}
              className={`pb-2.5 transition border-b-2 cursor-pointer ${
                activeTabSubView === 'operators'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              2. Desglose por Operador ({summary.operadoresImpacto.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTabSubView('dates')}
              className={`pb-2.5 transition border-b-2 cursor-pointer ${
                activeTabSubView === 'dates'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              3. Desglose por Fecha & Turno ({summary.fechasImpacto.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTabSubView('log')}
              className={`pb-2.5 transition border-b-2 cursor-pointer ${
                activeTabSubView === 'log'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              4. Bitácora de Registros ({summary.registrosFiltrados.length})
            </button>
          </nav>
        </div>

        {/* SECCIÓN 1: IMPACTO Y DURACIÓN POR MÁQUINA */}
        {(activeTabSubView === 'all' || activeTabSubView === 'machines') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-600" />
                1. Desglose de Duración y Ocurrencias por Máquina ({summary.maquinasImpacto.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                Ordenado por mayor tiempo acumulado
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Máquina (MaqDes)</th>
                    <th className="py-2.5 px-3 text-right">Minutos Totales</th>
                    <th className="py-2.5 px-3 text-right">Horas</th>
                    <th className="py-2.5 px-3 text-right">Ocurrencias</th>
                    <th className="py-2.5 px-3 text-right">% del Evento</th>
                    <th className="py-2.5 px-3 text-right">Duración Media</th>
                    <th className="py-2.5 px-3">Operadores que lo registraron</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {summary.maquinasImpacto.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        No se registraron ocurrencias de este evento en las máquinas y periodo filtrados.
                      </td>
                    </tr>
                  ) : (
                    summary.maquinasImpacto.map((m, idx) => (
                      <tr key={m.maqDes} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span>{m.maqDes}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900">
                          {m.minutos.toLocaleString()} min
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {m.horas} h
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                          {m.veces} veces
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2 font-mono">
                            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-600 rounded-full" 
                                style={{ width: `${Math.min(m.porcentajeDelEvento, 100)}%` }} 
                              />
                            </div>
                            <span className="font-bold text-slate-900 w-12 text-right">{m.porcentajeDelEvento}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                          {m.duracionPromedioMin} min
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-[220px] truncate" title={m.operadoresInvolucrados.join(', ')}>
                          {m.operadoresInvolucrados.join(', ') || 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECCIÓN 2: IMPACTO Y DURACIÓN POR OPERADOR */}
        {(activeTabSubView === 'all' || activeTabSubView === 'operators') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-600" />
                2. Desglose de Duración y Ocurrencias por Operador ({summary.operadoresImpacto.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                Ordenado por mayor tiempo asignado
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Operador</th>
                    <th className="py-2.5 px-3 text-right">Minutos Totales</th>
                    <th className="py-2.5 px-3 text-right">Horas</th>
                    <th className="py-2.5 px-3 text-right">Ocurrencias</th>
                    <th className="py-2.5 px-3 text-right">% del Evento</th>
                    <th className="py-2.5 px-3 text-right">Duración Media</th>
                    <th className="py-2.5 px-3">Máquinas Operadas durante el Evento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {summary.operadoresImpacto.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        No se registraron ocurrencias de operadores para este filtro.
                      </td>
                    </tr>
                  ) : (
                    summary.operadoresImpacto.map((op, idx) => (
                      <tr key={op.operador} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span>{op.operador}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900">
                          {op.minutos.toLocaleString()} min
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {op.horas} h
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                          {op.veces} veces
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2 font-mono">
                            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-600 rounded-full" 
                                style={{ width: `${Math.min(op.porcentajeDelEvento, 100)}%` }} 
                              />
                            </div>
                            <span className="font-bold text-slate-900 w-12 text-right">{op.porcentajeDelEvento}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                          {op.duracionPromedioMin} min
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-[220px] truncate" title={op.maquinasInvolucradas.join(', ')}>
                          {op.maquinasInvolucradas.join(', ') || 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECCIÓN 3: DESGLOSE POR FECHAS Y TURNOS */}
        {(activeTabSubView === 'all' || activeTabSubView === 'dates') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                3. Línea Temporal: Desglose por Fechas y Turnos ({summary.fechasImpacto.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                Asignación estricta por hora de inicio (HORAINI)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Fecha Operativa</th>
                    <th className="py-2.5 px-3">Turno</th>
                    <th className="py-2.5 px-3 text-right">Minutos Totales</th>
                    <th className="py-2.5 px-3 text-right">Horas</th>
                    <th className="py-2.5 px-3 text-right">Ocurrencias</th>
                    <th className="py-2.5 px-3">Máquinas Afectadas</th>
                    <th className="py-2.5 px-3">Operadores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {summary.fechasImpacto.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        No hay fechas registradas para los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    summary.fechasImpacto.map((d) => (
                      <tr key={`${d.fecha}_${d.turno}`} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {d.fecha}
                        </td>
                        <td className="py-2.5 px-3 font-semibold">
                          {d.turno === 'NOCHE' ? (
                            <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[10px]">
                              Turno Noche (19:00 - 06:59)
                            </span>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">
                              Turno Día (07:00 - 18:59)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900">
                          {d.minutos.toLocaleString()} min
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {d.horas} h
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                          {d.veces} reg
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-[200px] truncate" title={d.maquinas.join(', ')}>
                          {d.maquinas.join(', ')}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-[200px] truncate" title={d.operadores.join(', ')}>
                          {d.operadores.join(', ')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECCIÓN 4: BITÁCORA INDIVIDUAL DE OCURRENCIAS */}
        {(activeTabSubView === 'all' || activeTabSubView === 'log') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                4. Bitácora Completa de Registros ({summary.registrosFiltrados.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                Detalle registro a registro
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">OP (odtcod)</th>
                    <th className="py-2.5 px-3">Máquina</th>
                    <th className="py-2.5 px-3">Operador</th>
                    <th className="py-2.5 px-3">Fecha y Turno</th>
                    <th className="py-2.5 px-3">Horario</th>
                    <th className="py-2.5 px-3 text-right">Duración</th>
                    <th className="py-2.5 px-3 text-right">Pliegos Buenos</th>
                    <th className="py-2.5 px-3 text-right">Scrap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {summary.registrosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        No hay registros que coincidan con los criterios seleccionados.
                      </td>
                    </tr>
                  ) : (
                    summary.registrosFiltrados.map((r, i) => (
                      <tr key={r.id || `${r.odtcod}_${i}`} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{i + 1}</td>
                        <td className="py-2 px-3">
                          <span className="font-mono font-bold text-slate-900">{r.odtcod}</span>
                          <span className="block text-[10px] text-slate-500 truncate max-w-[140px]">{r.ODTDESCRIP}</span>
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{r.MaqDes}</td>
                        <td className="py-2 px-3 text-slate-700">{r.DesOperador}</td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          <div>{r.fechaTurno || r.FECHAINI}</div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            r.turno === 'NOCHE' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {r.turno || 'DIA'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                          {r.HORAINI} - {r.HORAFIN}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-indigo-900">
                          {r.minutos} min
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700">
                          {r.PliegosParc.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600">
                          {r.pliegosparcmal.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. SECCIÓN DE CONFORMIDAD Y FIRMAS PARA AUDITORÍAS */}
        <div className="pt-6 border-t border-slate-200 space-y-6">
          <div className="text-xs text-slate-600 italic">
            El presente informe certifica los tiempos y ocurrencias del evento auditado. Computado estrictamente con base en los registros de inicio (HORAINI) y las jornadas operativas de planta.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-800">{auditorName}</div>
              <div className="text-[11px] text-slate-500">Auditor Interno / Control de Gestión</div>
            </div>

            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-800">Jefatura de Mantenimiento / Turno</div>
              <div className="text-[11px] text-slate-500">Supervisión Operativa de Planta</div>
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

import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Trash2, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ProductionRecord, ShiftType } from '../types';
import { parseExcelFile, downloadExcelTemplate } from '../utils/excelHandler';
import { getShiftFromTime, getRecordShiftInfo, getOperationalDate } from '../utils/shifts';

interface DataManagementViewProps {
  records: ProductionRecord[];
  onUpdateRecords: (newRecords: ProductionRecord[]) => void;
}

export const DataManagementView: React.FC<DataManagementViewProps> = ({
  records,
  onUpdateRecords,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [isAddingRow, setIsAddingRow] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nuevo registro manual
  const [newRow, setNewRow] = useState<Partial<ProductionRecord>>({
    odtcod: 'OP-45100',
    ODTDESCRIP: 'Nuevo Producto / Empaque',
    DesOperador: 'Carlos Méndez',
    MaqDes: 'Heidelberg Speedmaster XL 106',
    Proceso: 'Producción',
    FECHAINI: new Date().toISOString().split('T')[0],
    HORAINI: '08:00',
    FECHAFIN: new Date().toISOString().split('T')[0],
    HORAFIN: '12:00',
    minutos: 240,
    PliegosParc: 43200,
    pliegosparcmal: 250,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setUploadResult(null);

    const result = await parseExcelFile(file);
    setIsProcessingFile(false);

    if (result.success) {
      onUpdateRecords(result.records);
      setUploadResult({
        success: true,
        msg: `¡Éxito! Se importaron correctamente ${result.records.length} registros desde "${file.name}". Los turnos (Día / Noche) han sido clasificados automáticamente.`
      });
    } else {
      setUploadResult({
        success: false,
        msg: `Error al importar: ${result.errors.join('. ')}`
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddRowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const horaIni = newRow.HORAINI || '08:00';
    const fecIni = newRow.FECHAINI || new Date().toISOString().split('T')[0];
    const shiftInfo = getRecordShiftInfo(fecIni, horaIni);

    const created: ProductionRecord = {
      id: `manual-${Date.now()}`,
      odtcod: newRow.odtcod || 'OP-00000',
      ODTDESCRIP: newRow.ODTDESCRIP || 'Producto s/d',
      DesOperador: newRow.DesOperador || 'Operador',
      MaqDes: newRow.MaqDes || 'Máquina',
      Proceso: newRow.Proceso || 'Producción',
      FECHAINI: fecIni,
      HORAINI: horaIni,
      FECHAFIN: newRow.FECHAFIN || fecIni,
      HORAFIN: newRow.HORAFIN || horaIni,
      minutos: Number(newRow.minutos) || 0,
      PliegosParc: Number(newRow.PliegosParc) || 0,
      pliegosparcmal: Number(newRow.pliegosparcmal) || 0,
      turno: shiftInfo.turno,
      fechaTurno: shiftInfo.fechaTurno,
    };

    onUpdateRecords([created, ...records]);
    setIsAddingRow(false);
    setUploadResult({
      success: true,
      msg: `Registro para la OP ${created.odtcod} añadido exitosamente.`
    });
  };

  const handleDeleteRow = (id: string) => {
    onUpdateRecords(records.filter(r => r.id !== id));
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearAll = () => {
    onUpdateRecords([]);
    setShowClearConfirm(false);
  };

  // Filtrado de búsqueda en tabla
  const filtered = records.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.odtcod.toLowerCase().includes(term) ||
      r.ODTDESCRIP.toLowerCase().includes(term) ||
      r.DesOperador.toLowerCase().includes(term) ||
      r.MaqDes.toLowerCase().includes(term) ||
      r.Proceso.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      
      {/* SECCIÓN DE CARGA Y DESCARGA DE ARCHIVOS */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Gestión e Importación de Datos de Producción
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sube tus archivos de Excel (.xlsx, .xls) o CSV con el formato estándar de control de planta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadExcelTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Plantilla Excel</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingFile}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isProcessingFile ? 'Procesando...' : 'Subir Archivo Excel'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Zona Dropzone Visual */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-lg p-6 text-center cursor-pointer transition-colors"
        >
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">
            Haz clic aquí para seleccionar o arrastra tu archivo Excel
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Formatos aceptados: .xlsx, .xls, .csv. Columnas esperadas:
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 mt-2 font-mono text-[10px] text-slate-600">
            {['odtcod', 'ODTDESCRIP', 'DesOperador', 'MaqDes', 'Proceso', 'FECHAINI', 'HORAINI', 'FECHAFIN', 'HORAFIN', 'minutos', 'PliegosParc', 'pliegosparcmal'].map(col => (
              <span key={col} className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                {col}
              </span>
            ))}
          </div>
        </div>

        {/* Notificación de resultado de subida */}
        {uploadResult && (
          <div className={`p-3 rounded-md text-xs flex items-center gap-2 ${
            uploadResult.success 
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}>
            {uploadResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{uploadResult.msg}</span>
          </div>
        )}
      </div>

      {/* FORMULARIO AGREGAR REGISTRO MANUAL */}
      {isAddingRow && (
        <form onSubmit={handleAddRowSubmit} className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Añadir Registro Manual de Producción
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingRow(false)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 mb-1">OP (odtcod) *</label>
              <input
                type="text"
                required
                value={newRow.odtcod}
                onChange={(e) => setNewRow({ ...newRow, odtcod: e.target.value })}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Descripción Producto (ODTDESCRIP)</label>
              <input
                type="text"
                value={newRow.ODTDESCRIP}
                onChange={(e) => setNewRow({ ...newRow, ODTDESCRIP: e.target.value })}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Operador (DesOperador) *</label>
              <input
                type="text"
                required
                value={newRow.DesOperador}
                onChange={(e) => setNewRow({ ...newRow, DesOperador: e.target.value })}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Máquina (MaqDes) *</label>
              <input
                type="text"
                required
                value={newRow.MaqDes}
                onChange={(e) => setNewRow({ ...newRow, MaqDes: e.target.value })}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Proceso / Evento</label>
              <select
                value={newRow.Proceso}
                onChange={(e) => setNewRow({ ...newRow, Proceso: e.target.value })}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
              >
                <option value="Producción">Producción (Tirada activa)</option>
                <option value="Ajuste / Puesta a Punto">Ajuste / Puesta a Punto</option>
                <option value="Limpieza y Lavado">Limpieza y Lavado</option>
                <option value="Mantenimiento Preventivo">Mantenimiento Preventivo</option>
                <option value="Mantenimiento Correctivo">Mantenimiento Correctivo</option>
                <option value="Espera de Material / Tintas">Espera de Material / Tintas</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Fecha y Hora Inicio</label>
              <div className="flex gap-1">
                <input
                  type="date"
                  value={newRow.FECHAINI}
                  onChange={(e) => setNewRow({ ...newRow, FECHAINI: e.target.value })}
                  className="w-2/3 border border-slate-300 rounded px-2 py-1.5 font-mono text-[11px]"
                />
                <input
                  type="time"
                  value={newRow.HORAINI}
                  onChange={(e) => setNewRow({ ...newRow, HORAINI: e.target.value })}
                  className="w-1/3 border border-slate-300 rounded px-1 py-1.5 font-mono text-[11px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Minutos Totales (duración)</label>
              <input
                type="number"
                min={1}
                value={newRow.minutos}
                onChange={(e) => setNewRow({ ...newRow, minutos: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Pliegos Conformes / Defectuosos</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="Buenos"
                  value={newRow.PliegosParc}
                  onChange={(e) => setNewRow({ ...newRow, PliegosParc: Number(e.target.value) })}
                  className="w-1/2 border border-slate-300 rounded px-2 py-1.5 font-mono text-emerald-700 font-bold"
                />
                <input
                  type="number"
                  placeholder="Scrap"
                  value={newRow.pliegosparcmal}
                  onChange={(e) => setNewRow({ ...newRow, pliegosparcmal: Number(e.target.value) })}
                  className="w-1/2 border border-slate-300 rounded px-2 py-1.5 font-mono text-rose-600"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingRow(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded cursor-pointer"
            >
              Guardar Registro
            </button>
          </div>
        </form>
      )}

      {/* TABLA DE REGISTROS DE PRODUCCIÓN */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Registros Cargados en Sistema ({filtered.length})
            </h3>
            <span className="text-xs text-slate-500">
              Visualización completa de las 12 columnas del archivo Excel con detección de turnos
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar registros..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAddingRow(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Fila</span>
            </button>

            {records.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded transition-colors cursor-pointer"
                title="Vaciar tabla de datos"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vaciar</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal confirmación para vaciar */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="bg-white rounded-lg max-w-sm w-full p-5 space-y-3 shadow-xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">¿Vaciar todos los registros?</h3>
              <p className="text-xs text-slate-600">
                Se eliminarán los {records.length} registros cargados actualmente. Puedes recargar los datos demo en cualquier momento.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded cursor-pointer"
                >
                  Sí, Vaciar Todo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabla con todas las 12 columnas exactas */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2 px-2.5 whitespace-nowrap">OP (odtcod)</th>
                <th className="py-2 px-2.5 whitespace-nowrap">Descripción (ODTDESCRIP)</th>
                <th className="py-2 px-2.5 whitespace-nowrap">Operador (DesOperador)</th>
                <th className="py-2 px-2.5 whitespace-nowrap">Máquina (MaqDes)</th>
                <th className="py-2 px-2.5 whitespace-nowrap">Evento (Proceso)</th>
                <th className="py-2 px-2.5 text-center whitespace-nowrap">Turno</th>
                <th className="py-2 px-2.5 whitespace-nowrap">Inicio (FECHA/HORA)</th>
                <th className="py-2 px-2.5 whitespace-nowrap">Fin (FECHA/HORA)</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap">minutos</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap text-emerald-700">PliegosParc (Buenas)</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap text-rose-600">pliegosparcmal (Scrap)</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap">und/min</th>
                <th className="py-2 px-2.5 text-center whitespace-nowrap">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-400">
                    No se encontraron registros de producción. Carga un archivo Excel o presiona "Cargar Datos Demo".
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r) => {
                  const shift = r.turno || getShiftFromTime(r.HORAINI);
                  const operationalDate = r.fechaTurno || getOperationalDate(r.FECHAINI, r.HORAINI);
                  const speed = (r.minutos > 0 && r.PliegosParc > 0)
                    ? Math.round((r.PliegosParc / r.minutos) * 10) / 10
                    : 0;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {r.odtcod}
                      </td>
                      <td className="py-2 px-2.5 text-slate-700 max-w-[200px] truncate" title={r.ODTDESCRIP}>
                        {r.ODTDESCRIP}
                      </td>
                      <td className="py-2 px-2.5 font-medium text-slate-900 whitespace-nowrap">
                        {r.DesOperador}
                      </td>
                      <td className="py-2 px-2.5 text-slate-700 whitespace-nowrap">
                        {r.MaqDes}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          r.Proceso.toLowerCase().includes('producc') || r.Proceso.toLowerCase().includes('tirada')
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {r.Proceso}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        {shift === 'DIA' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title={`Turno Día (07:00 - 18:59) • Fecha Operativa: ${operationalDate}`}>
                            <Sun className="w-2.5 h-2.5 text-amber-500" /> Día
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200" title={`Turno Noche (19:00 - 06:59) • Fecha Operativa: ${operationalDate}`}>
                            <Moon className="w-2.5 h-2.5 text-indigo-500" /> Noche
                          </span>
                        )}
                        {operationalDate && (
                          <span className="block text-[9px] text-slate-400 font-mono mt-0.5" title="Fecha Operativa del Turno">
                            {operationalDate}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {r.FECHAINI} {r.HORAINI}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {r.FECHAFIN} {r.HORAFIN}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        {r.minutos}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {r.PliegosParc.toLocaleString()}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-rose-600 whitespace-nowrap">
                        {r.pliegosparcmal.toLocaleString()}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                        {speed > 0 ? `${speed} u/m` : '-'}
                      </td>
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(r.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          title="Eliminar este registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {filtered.length > pageSize && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
            <span>
              Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filtered.length)} de {filtered.length} registros
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-mono">
                Página {currentPage} de {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

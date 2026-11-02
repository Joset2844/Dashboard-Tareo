import * as XLSX from 'xlsx';
import { ProductionRecord, ShiftType, SHIFT_BASE_MINUTES, SHIFT_BASE_HOURS } from '../types';
import { getShiftFromTime, getRecordShiftInfo } from './shifts';

// Encabezados esperados del Excel
export const REQUIRED_HEADERS = [
  'odtcod',
  'ODTDESCRIP',
  'DesOperador',
  'MaqDes',
  'Proceso',
  'FECHAINI',
  'HORAINI',
  'FECHAFIN',
  'HORAFIN',
  'minutos',
  'PliegosParc',
  'pliegosparcmal'
] as const;

function normalizeHeader(header: string): string {
  return header
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Lee un archivo Excel / CSV y retorna la lista de ProductionRecord
 */
export async function parseExcelFile(file: File): Promise<{
  success: boolean;
  records: ProductionRecord[];
  errors: string[];
  totalRows: number;
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve({ success: false, records: [], errors: ['El archivo está vacío'], totalRows: 0 });
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          resolve({
            success: false,
            records: [],
            errors: ['La primera hoja del archivo no contiene filas con datos'],
            totalRows: 0
          });
          return;
        }

        const sampleRow = rawJson[0];
        const keyMap: Record<string, string> = {};

        Object.keys(sampleRow).forEach((rawKey) => {
          const norm = normalizeHeader(rawKey);
          if (norm === 'odtcod' || norm === 'op' || norm === 'orden') keyMap['odtcod'] = rawKey;
          else if (norm === 'odtdescrip' || norm === 'descripcion' || norm === 'producto') keyMap['ODTDESCRIP'] = rawKey;
          else if (norm === 'desoperador' || norm === 'operador' || norm === 'nombreoperador') keyMap['DesOperador'] = rawKey;
          else if (norm === 'maqdes' || norm === 'maquina' || norm === 'equipodes') keyMap['MaqDes'] = rawKey;
          else if (norm === 'proceso' || norm === 'evento' || norm === 'actividad') keyMap['Proceso'] = rawKey;
          else if (norm === 'fechaini' || norm === 'fechainicio' || norm === 'fecini') keyMap['FECHAINI'] = rawKey;
          else if (norm === 'horaini' || norm === 'horainicio' || norm === 'hrini') keyMap['HORAINI'] = rawKey;
          else if (norm === 'fechafin' || norm === 'fechafinal' || norm === 'fecfin') keyMap['FECHAFIN'] = rawKey;
          else if (norm === 'horafin' || norm === 'horafinal' || norm === 'hrfin') keyMap['HORAFIN'] = rawKey;
          else if (norm === 'minutos' || norm === 'duracion' || norm === 'duracionminutos') keyMap['minutos'] = rawKey;
          else if (norm === 'pliegosparc' || norm === 'buenos' || norm === 'cantidadbuena' || norm === 'pliegosbuenos') keyMap['PliegosParc'] = rawKey;
          else if (norm === 'pliegosparcmal' || norm === 'malos' || norm === 'defectuosos' || norm === 'merma' || norm === 'scrap') keyMap['pliegosparcmal'] = rawKey;
        });

        const records: ProductionRecord[] = [];
        const errors: string[] = [];

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2;
          const odtcod = String(row[keyMap['odtcod'] || 'odtcod'] || '').trim();
          const descrip = String(row[keyMap['ODTDESCRIP'] || 'ODTDESCRIP'] || '').trim();
          const operador = String(row[keyMap['DesOperador'] || 'DesOperador'] || '').trim();
          const maquina = String(row[keyMap['MaqDes'] || 'MaqDes'] || '').trim();
          const proceso = String(row[keyMap['Proceso'] || 'Proceso'] || 'Producción').trim();

          let fechaIni = String(row[keyMap['FECHAINI'] || 'FECHAINI'] || '').trim();
          let horaIni = String(row[keyMap['HORAINI'] || 'HORAINI'] || '07:00').trim();
          let fechaFin = String(row[keyMap['FECHAFIN'] || 'FECHAFIN'] || fechaIni).trim();
          let horaFin = String(row[keyMap['HORAFIN'] || 'HORAFIN'] || '').trim();

          if (row[keyMap['FECHAINI'] || 'FECHAINI'] instanceof Date) {
            fechaIni = (row[keyMap['FECHAINI'] || 'FECHAINI'] as Date).toISOString().split('T')[0];
          }
          if (row[keyMap['FECHAFIN'] || 'FECHAFIN'] instanceof Date) {
            fechaFin = (row[keyMap['FECHAFIN'] || 'FECHAFIN'] as Date).toISOString().split('T')[0];
          }

          const rawMinutos = row[keyMap['minutos'] || 'minutos'];
          const minutos = parseFloat(String(rawMinutos).replace(',', '.')) || 0;

          const rawBuenos = row[keyMap['PliegosParc'] || 'PliegosParc'];
          const pliegosParc = parseFloat(String(rawBuenos).replace(',', '.')) || 0;

          const rawMalos = row[keyMap['pliegosparcmal'] || 'pliegosparcmal'];
          const pliegosParcMal = parseFloat(String(rawMalos).replace(',', '.')) || 0;

          if (!odtcod && !maquina && !operador && minutos === 0 && pliegosParc === 0) {
            return;
          }

          const { turno, fechaTurno } = getRecordShiftInfo(fechaIni, horaIni);

          records.push({
            id: `excel-row-${rowNum}-${Date.now().toString(36)}`,
            odtcod: odtcod || `OP-${rowNum}`,
            ODTDESCRIP: descrip || 'Producto s/d',
            DesOperador: operador || 'Operador No Identificado',
            MaqDes: maquina || 'Máquina General',
            Proceso: proceso || 'Producción',
            FECHAINI: fechaIni || new Date().toISOString().split('T')[0],
            HORAINI: horaIni || '07:00',
            FECHAFIN: fechaFin || fechaIni || new Date().toISOString().split('T')[0],
            HORAFIN: horaFin || horaIni,
            minutos: Math.max(0, Math.round(minutos)),
            PliegosParc: Math.max(0, Math.round(pliegosParc)),
            pliegosparcmal: Math.max(0, Math.round(pliegosParcMal)),
            turno,
            fechaTurno,
          });
        });

        if (records.length === 0) {
          errors.push('No se pudieron extraer registros válidos. Verifica los encabezados del archivo.');
        }

        resolve({
          success: records.length > 0,
          records,
          errors,
          totalRows: rawJson.length
        });
      } catch (err: any) {
        resolve({
          success: false,
          records: [],
          errors: [`Error al procesar archivo: ${err?.message || 'Formato desconocido'}`],
          totalRows: 0
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        records: [],
        errors: ['Error en la lectura del archivo'],
        totalRows: 0
      });
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Descarga plantilla oficial en Excel (.xlsx) con los nombres de columna exactos
 */
export function downloadExcelTemplate(): void {
  const sampleData = [
    {
      odtcod: 'OP-45012',
      ODTDESCRIP: 'Estuche Jarabe Pediátrico 120ml',
      DesOperador: 'Operador 01',
      MaqDes: 'Heidelberg Speedmaster XL 106',
      Proceso: 'Producción',
      FECHAINI: '2026-10-31',
      HORAINI: '08:00',
      FECHAFIN: '2026-10-31',
      HORAFIN: '11:30',
      minutos: 210,
      PliegosParc: 38850,
      pliegosparcmal: 340
    },
    {
      odtcod: 'OP-45012',
      ODTDESCRIP: 'Estuche Jarabe Pediátrico 120ml',
      DesOperador: 'Operador 01',
      MaqDes: 'Heidelberg Speedmaster XL 106',
      Proceso: 'Limpieza y Lavado',
      FECHAINI: '2026-10-31',
      HORAINI: '11:30',
      FECHAFIN: '2026-10-31',
      HORAFIN: '12:00',
      minutos: 30,
      PliegosParc: 0,
      pliegosparcmal: 0
    },
    {
      odtcod: 'OP-45025',
      ODTDESCRIP: 'Empaque Alimento Snack Familiar 500g',
      DesOperador: 'Roberto Silva',
      MaqDes: 'Heidelberg Speedmaster XL 106',
      Proceso: 'Producción',
      FECHAINI: '2026-10-31',
      HORAINI: '20:10',
      FECHAFIN: '2026-11-01',
      HORAFIN: '01:40',
      minutos: 330,
      PliegosParc: 56100,
      pliegosparcmal: 620
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData, { header: [...REQUIRED_HEADERS] });
  
  ws['!cols'] = [
    { wch: 12 }, { wch: 38 }, { wch: 22 }, { wch: 30 }, { wch: 24 },
    { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    { wch: 14 }, { wch: 16 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DatosProduccion');
  XLSX.writeFile(wb, 'Plantilla_Produccion_Eficiencia.xlsx');
}

/**
 * Exporta reporte completo de auditoría a Excel (.xlsx) con múltiples pestañas
 */
export function exportAuditReportToExcel(params: {
  reportTitle: string;
  auditorName: string;
  shiftFilter: string;
  machineFilter?: string;
  operatorFilter?: string;
  processFilter?: string;
  dateFilter: string;
  records: ProductionRecord[];
  machineMetrics: any[];
  operatorMetrics: any[];
  topEvents: any[];
  kpis: any;
  globalSettings?: { globalQualityTargetPct?: number; globalWarningThresholdPct?: number };
}): void {
  const wb = XLSX.utils.book_new();

  // 1. Hoja de Resumen Ejecutivo y KPIs
  const kpiData = [
    { Indicador: 'Título del Reporte', Valor: params.reportTitle },
    { Indicador: 'Fecha de Emisión', Valor: new Date().toLocaleString() },
    { Indicador: 'Auditor Responsable', Valor: params.auditorName || 'Auditoría Interna' },
    { Indicador: 'Turno Auditado', Valor: params.shiftFilter },
    { Indicador: 'Máquina Auditada', Valor: params.machineFilter || 'Todas las máquinas' },
    { Indicador: 'Operador Auditado', Valor: params.operatorFilter || 'Todos los operadores' },
    { Indicador: 'Evento / Proceso Auditado', Valor: params.processFilter || 'Todos los eventos' },
    { Indicador: 'Base de Turno Oficial', Valor: `${SHIFT_BASE_HOURS} Horas (${SHIFT_BASE_MINUTES} Minutos)` },
    { Indicador: 'Meta de Calidad Estándar Planta', Valor: `${params.globalSettings?.globalQualityTargetPct ?? 98}%` },
    { Indicador: 'Umbral Mínimo de Alerta Planta', Valor: `${params.globalSettings?.globalWarningThresholdPct ?? 85}%` },
    { Indicador: 'Rango de Fechas', Valor: params.dateFilter || 'Todas las fechas' },
    { Indicador: '', Valor: '' },
    { Indicador: 'Total Registros Auditados', Valor: params.kpis.totalRecords },
    { Indicador: 'Total Pliegos Buenos (Conformes)', Valor: params.kpis.totalPliegosBuenos },
    { Indicador: 'Total Pliegos Defectuosos (Scrap)', Valor: params.kpis.totalPliegosMalos },
    { Indicador: 'Tasa Global de Calidad (%)', Valor: `${params.kpis.tasaCalidadGlobal}%` },
    { Indicador: 'Tasa Global de Merma (%)', Valor: `${params.kpis.mermaPctGlobal}%` },
    { Indicador: 'Tiempo Total Reportado (Minutos)', Valor: params.kpis.totalMinutos },
    { Indicador: 'Tiempo Neto en Producción (Minutos)', Valor: params.kpis.totalMinutosProduccion },
    { Indicador: 'Tiempo en Paradas / Ajustes (Minutos)', Valor: params.kpis.totalMinutosParadas },
    { Indicador: 'Disponibilidad Global (%)', Valor: `${params.kpis.disponibilidadGlobal}%` },
    { Indicador: 'Velocidad Media Real (und/min)', Valor: `${params.kpis.velocidadPromedioReal} und/min` },
    { Indicador: 'Eficiencia Global de Velocidad vs Metas (%)', Valor: `${params.kpis.eficienciaGlobalVelocidad}%` },
    { Indicador: 'OEE Global Estimado (%)', Valor: `${params.kpis.oeeGlobal}%` }
  ];
  const wsKpis = XLSX.utils.json_to_sheet(kpiData);
  wsKpis['!cols'] = [{ wch: 45 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsKpis, 'Resumen_Ejecutivo');

  // 2. Hoja de Eficiencia por Máquina
  const machineRows = params.machineMetrics.map(m => ({
    'Máquina': m.maqDes,
    'Meta (und/min)': m.metaUndMin,
    'Meta Turno (675 min / 11.25h)': m.metaTurnoBase,
    'Velocidad Real (und/min)': m.realUndMin,
    'Eficiencia Velocidad (%)': `${m.eficienciaVelocidad}%`,
    'Umbral Alerta (%)': `${m.warningThreshold ?? 85}%`,
    'Tasa Calidad (%)': `${m.tasaCalidad}%`,
    'Meta Calidad (%)': `${m.metaCalidad ?? 98}%`,
    'Disponibilidad (%)': `${m.disponibilidad}%`,
    'OEE (%)': `${m.oee}%`,
    'Pliegos Buenos': m.pliegosBuenos,
    'Pliegos Defectuosos': m.pliegosMalos,
    'Minutos Producción': m.minutosProd,
    'Minutos Parada': m.minutosParada,
    'Total Minutos': m.totalMinutos,
    'Estado': m.status === 'green' ? 'Cumple Meta' : m.status === 'yellow' ? 'Alerta' : 'Bajo Meta'
  }));
  const wsMachines = XLSX.utils.json_to_sheet(machineRows);
  wsMachines['!cols'] = [
    { wch: 32 }, { wch: 16 }, { wch: 28 }, { wch: 22 }, { wch: 22 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 18 },
    { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, wsMachines, 'Eficiencia_Maquinas');

  // 3. Hoja de Eficiencia por Operador
  const operatorRows = params.operatorMetrics.map((op, idx) => ({
    'Ranking': idx + 1,
    'Operador': op.operador,
    'Velocidad Real (und/min)': op.realUndMin,
    'Meta Estimada (und/min)': op.metaUndMinEstimada,
    'Meta Estimada Turno (675 min)': op.metaTurnoBaseEstimada,
    'Eficiencia (%)': `${op.eficienciaVelocidad}%`,
    'Tasa Calidad (%)': `${op.tasaCalidad}%`,
    'Tasa Merma (%)': `${op.tasaMerma}%`,
    'Pliegos Buenos': op.pliegosBuenos,
    'Pliegos Malos': op.pliegosMalos,
    'Minutos en Producción': op.minutosProd,
    'Minutos Totales': op.totalMinutos,
    'Máquinas Operadas': op.maquinas.join(', ')
  }));
  const wsOperators = XLSX.utils.json_to_sheet(operatorRows);
  wsOperators['!cols'] = [
    { wch: 10 }, { wch: 26 }, { wch: 22 }, { wch: 22 }, { wch: 28 }, { wch: 16 },
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 20 },
    { wch: 16 }, { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(wb, wsOperators, 'Eficiencia_Operadores');

  // 4. Hoja de Desglose de Eventos / Paradas
  const eventRows = params.topEvents.map(e => ({
    'Evento / Proceso': e.proceso,
    'Tipo': e.esProduccion ? 'Producción Activa' : 'Parada / No Productivo',
    'Minutos Totales': e.minutos,
    'Porcentaje del Tiempo (%)': `${e.porcentaje}%`,
    'Frecuencia (Veces)': e.veces
  }));
  const wsEvents = XLSX.utils.json_to_sheet(eventRows);
  wsEvents['!cols'] = [{ wch: 38 }, { wch: 24 }, { wch: 16 }, { wch: 24 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsEvents, 'Analisis_Eventos');

  // 5. Hoja Detalle Registros
  const detailRows = params.records.map(r => ({
    'OP (odtcod)': r.odtcod,
    'Descripción (ODTDESCRIP)': r.ODTDESCRIP,
    'Operador (DesOperador)': r.DesOperador,
    'Máquina (MaqDes)': r.MaqDes,
    'Evento (Proceso)': r.Proceso,
    'Turno': r.turno || 'Día',
    'Fecha Turno (Operativa)': r.fechaTurno || r.FECHAINI,
    'Fecha Inicio': r.FECHAINI,
    'Hora Inicio': r.HORAINI,
    'Fecha Fin': r.FECHAFIN,
    'Hora Fin': r.HORAFIN,
    'Minutos': r.minutos,
    'Cantidad Buena (PliegosParc)': r.PliegosParc,
    'Cantidad Defectuosa (pliegosparcmal)': r.pliegosparcmal,
    'Velocidad (und/min)': (r.minutos > 0 && r.PliegosParc > 0) ? (Math.round((r.PliegosParc / r.minutos) * 10) / 10) : 0
  }));
  const wsDetails = XLSX.utils.json_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Detalle_Registros_OP');

  const fileName = `Auditoria_Eficiencia_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Exporta el análisis e informe de un evento específico o paradas a Excel (.xlsx)
 */
export function exportEventAnalysisToExcel(params: {
  eventName: string;
  filtersDescription: {
    dateRange: string;
    machines: string;
    operator: string;
    shift: string;
  };
  summary: {
    eventoNombre: string;
    esProduccion: boolean;
    totalMinutos: number;
    totalHoras: number;
    totalOcurrencias: number;
    duracionPromedioMin: number;
    minutosPlantaTotalPeriodo: number;
    porcentajeSobreTotalPlanta: number;
    totalPliegosBuenos: number;
    totalPliegosMalos: number;
    maquinasImpacto: Array<{
      maqDes: string;
      minutos: number;
      horas: number;
      veces: number;
      porcentajeDelEvento: number;
      duracionPromedioMin: number;
      operadoresInvolucrados: string[];
    }>;
    operadoresImpacto: Array<{
      operador: string;
      minutos: number;
      horas: number;
      veces: number;
      porcentajeDelEvento: number;
      duracionPromedioMin: number;
      maquinasInvolucradas: string[];
    }>;
    fechasImpacto: Array<{
      fecha: string;
      turno: string;
      minutos: number;
      horas: number;
      veces: number;
      maquinas: string[];
      operadores: string[];
    }>;
    registrosFiltrados: Array<any>;
  };
}): void {
  const wb = XLSX.utils.book_new();
  const { eventName, filtersDescription, summary } = params;

  // 1. Resumen Ejecutivo
  const resumenRows = [
    { 'Concepto': 'Evento / Proceso Analizado', 'Valor': eventName },
    { 'Concepto': 'Tipo de Evento', 'Valor': summary.esProduccion ? 'Producción Efectiva' : 'Parada / Inactividad' },
    { 'Concepto': 'Periodo de Fechas', 'Valor': filtersDescription.dateRange },
    { 'Concepto': 'Máquinas Filtradas', 'Valor': filtersDescription.machines },
    { 'Concepto': 'Operadores Filtrados', 'Valor': filtersDescription.operator },
    { 'Concepto': 'Turno Filtrado', 'Valor': filtersDescription.shift },
    { 'Concepto': 'Tiempo Total Acumulado (Minutos)', 'Valor': summary.totalMinutos },
    { 'Concepto': 'Tiempo Total Acumulado (Horas)', 'Valor': summary.totalHoras },
    { 'Concepto': 'Total de Ocurrencias / Registros', 'Valor': summary.totalOcurrencias },
    { 'Concepto': 'Duración Promedio por Evento (Minutos)', 'Valor': summary.duracionPromedioMin },
    { 'Concepto': '% Impacto sobre Tiempo Total de Planta', 'Valor': `${summary.porcentajeSobreTotalPlanta}%` },
    { 'Concepto': 'Pliegos Conformes Conducidos', 'Valor': summary.totalPliegosBuenos },
    { 'Concepto': 'Pliegos de Merma / Scrap', 'Valor': summary.totalPliegosMalos },
    { 'Concepto': 'Fecha de Emisión del Reporte', 'Valor': new Date().toLocaleString() },
  ];
  const wsResumen = XLSX.utils.json_to_sheet(resumenRows);
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen_Evento');

  // 2. Impacto por Máquina
  const machineRows = summary.maquinasImpacto.map(m => ({
    'Máquina (MaqDes)': m.maqDes,
    'Minutos Totales': m.minutos,
    'Horas Totales': m.horas,
    'Veces / Ocurrencias': m.veces,
    '% del Tiempo del Evento': `${m.porcentajeDelEvento}%`,
    'Duración Promedio (min)': m.duracionPromedioMin,
    'Operadores Involucrados': m.operadoresInvolucrados.join(', '),
  }));
  const wsMachines = XLSX.utils.json_to_sheet(machineRows);
  XLSX.utils.book_append_sheet(wb, wsMachines, 'Desglose_Maquinas');

  // 3. Impacto por Operador
  const operatorRows = summary.operadoresImpacto.map(op => ({
    'Operador (DesOperador)': op.operador,
    'Minutos Totales': op.minutos,
    'Horas Totales': op.horas,
    'Veces / Ocurrencias': op.veces,
    '% del Tiempo del Evento': `${op.porcentajeDelEvento}%`,
    'Duración Promedio (min)': op.duracionPromedioMin,
    'Máquinas Involucradas': op.maquinasInvolucradas.join(', '),
  }));
  const wsOperators = XLSX.utils.json_to_sheet(operatorRows);
  XLSX.utils.book_append_sheet(wb, wsOperators, 'Desglose_Operadores');

  // 4. Desglose por Fechas
  const dateRows = summary.fechasImpacto.map(d => ({
    'Fecha (Operativa Turno)': d.fecha,
    'Turno': d.turno,
    'Minutos Totales': d.minutos,
    'Horas Totales': d.horas,
    'Ocurrencias': d.veces,
    'Máquinas Afectadas': d.maquinas.join(', '),
    'Operadores': d.operadores.join(', '),
  }));
  const wsDates = XLSX.utils.json_to_sheet(dateRows);
  XLSX.utils.book_append_sheet(wb, wsDates, 'Desglose_Fechas');

  // 5. Bitácora Detallada de Ocurrencias
  const detailRows = summary.registrosFiltrados.map((r, i) => ({
    '#': i + 1,
    'OP (odtcod)': r.odtcod,
    'Descripción ODT': r.ODTDESCRIP,
    'Máquina': r.MaqDes,
    'Operador': r.DesOperador,
    'Evento / Proceso': r.Proceso,
    'Turno': r.turno || 'DIA',
    'Fecha Turno': r.fechaTurno || r.FECHAINI,
    'Fecha Inicio': r.FECHAINI,
    'Hora Inicio': r.HORAINI,
    'Fecha Fin': r.FECHAFIN,
    'Hora Fin': r.HORAFIN,
    'Minutos': r.minutos,
    'Horas': Math.round(((Number(r.minutos) || 0) / 60) * 10) / 10,
    'Pliegos Buenos': r.PliegosParc,
    'Pliegos Malos (Scrap)': r.pliegosparcmal,
  }));
  const wsDetails = XLSX.utils.json_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Bitacora_Ocurrencias');

  const cleanEventName = eventName.replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 25);
  const fileName = `Reporte_Evento_${cleanEventName}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

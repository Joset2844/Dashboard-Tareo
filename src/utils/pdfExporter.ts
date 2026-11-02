import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SHIFT_BASE_HOURS, SHIFT_BASE_MINUTES } from '../types';

interface PdfAuditParams {
  reportTitle: string;
  auditorName: string;
  shiftFilter: string;
  machineFilter?: string;
  operatorFilter?: string;
  processFilter?: string;
  dateFilter: string;
  kpis: {
    totalRecords: number;
    totalPliegosBuenos: number;
    totalPliegosMalos: number;
    totalMinutos: number;
    totalMinutosProduccion: number;
    totalMinutosParadas: number;
    velocidadPromedioReal: number;
    eficienciaGlobalVelocidad: number;
    tasaCalidadGlobal: number;
    mermaPctGlobal: number;
    disponibilidadGlobal: number;
    oeeGlobal: number;
  };
  machineMetrics: Array<{
    maqDes: string;
    metaUndMin: number;
    metaTurnoBase: number;
    realUndMin: number;
    eficienciaVelocidad: number;
    tasaCalidad: number;
    disponibilidad: number;
    oee: number;
    pliegosBuenos: number;
    pliegosMalos: number;
    minutosProd: number;
    status: string;
  }>;
  operatorMetrics: Array<{
    operador: string;
    realUndMin: number;
    metaUndMinEstimada: number;
    eficienciaVelocidad: number;
    tasaCalidad: number;
    tasaMerma: number;
    pliegosBuenos: number;
    pliegosMalos: number;
    minutosProd: number;
  }>;
  topEvents: Array<{
    proceso: string;
    minutos: number;
    porcentaje: number;
    esProduccion: boolean;
  }>;
  globalSettings?: {
    globalQualityTargetPct?: number;
    globalWarningThresholdPct?: number;
  };
}

export function buildAuditReportPdfDoc(params: PdfAuditParams): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 16;

  // Encabezado Corporativo Industrial
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(14, currentY, pageWidth - 28, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('AUDITORÍA INTERNA DE CONTROL DE PRODUCCIÓN & EFICIENCIA', 20, currentY + 9);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`BASE ESTÁNDAR: ${SHIFT_BASE_HOURS} HORAS (${SHIFT_BASE_MINUTES} MIN) POR TURNO | und/min EN TIEMPO PRODUCTIVO`, 20, currentY + 16);

  currentY += 28;

  // Metadatos de la Auditoría
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('METADATOS DE AUDITORÍA Y FILTROS APLICADOS', 14, currentY);

  doc.setFont('helvetica', 'normal');
  currentY += 5;

  const col1X = 14;
  const col2X = 110;

  doc.text(`Título: ${params.reportTitle}`, col1X, currentY);
  doc.text(`Fecha de Emisión: ${new Date().toLocaleString()}`, col2X, currentY);
  currentY += 5;

  doc.text(`Auditor: ${params.auditorName || 'Auditoría Interna'}`, col1X, currentY);
  doc.text(`Turno Auditado: ${params.shiftFilter}`, col2X, currentY);
  currentY += 5;

  doc.text(`Máquina Auditada: ${params.machineFilter || 'Todas las máquinas'}`, col1X, currentY);
  doc.text(`Operador Auditado: ${params.operatorFilter || 'Todos los operadores'}`, col2X, currentY);
  currentY += 5;

  doc.text(`Evento Auditado: ${params.processFilter || 'Todos los eventos'}`, col1X, currentY);
  doc.text(`Periodo: ${params.dateFilter || 'Histórico Completo'}`, col2X, currentY);
  currentY += 5;

  doc.text(`Meta Calidad Planta: ${params.globalSettings?.globalQualityTargetPct ?? 98}%`, col1X, currentY);
  doc.text(`Umbral Alerta Planta: <${params.globalSettings?.globalWarningThresholdPct ?? 85}%`, col2X, currentY);

  currentY += 8;

  // Cuadro Resumen Ejecutivo de KPIs
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, pageWidth - 28, 24, 2, 2, 'FD');

  const cardWidth = (pageWidth - 28) / 4;
  const kpiItems = [
    { label: 'DISPONIBILIDAD', val: `${params.kpis.disponibilidadGlobal}%`, sub: `${params.kpis.totalMinutosProduccion}m prod / ${params.kpis.totalMinutos}m tot` },
    { label: 'EFIC. VELOCIDAD', val: `${params.kpis.eficienciaGlobalVelocidad}%`, sub: `Prom: ${params.kpis.velocidadPromedioReal} und/min` },
    { label: 'CALIDAD (1RA)', val: `${params.kpis.tasaCalidadGlobal}%`, sub: `Merma: ${params.kpis.mermaPctGlobal}%` },
    { label: 'OEE CONSOLIDADO', val: `${params.kpis.oeeGlobal}%`, sub: 'Disp × Vel × Cal' },
  ];

  kpiItems.forEach((item, i) => {
    const x = 14 + i * cardWidth;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, x + cardWidth / 2, currentY + 6, { align: 'center' });

    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(item.val, x + cardWidth / 2, currentY + 14, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(item.sub, x + cardWidth / 2, currentY + 20, { align: 'center' });

    if (i < 3) {
      doc.setDrawColor(226, 232, 240);
      doc.line(x + cardWidth, currentY + 3, x + cardWidth, currentY + 21);
    }
  });

  currentY += 28;

  // 1. Tabla de Eficiencia por Máquina (Meta und/min vs Real)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`1. RENDIMIENTO DE MÁQUINAS (${params.machineMetrics.length} máquina(s) evaluada(s))`, 14, currentY);
  currentY += 3;

  const machineTableBody = params.machineMetrics.length > 0 
    ? params.machineMetrics.map(m => [
        m.maqDes,
        `${m.metaUndMin} u/m`,
        m.metaTurnoBase.toLocaleString(),
        `${m.realUndMin} u/m`,
        `${m.eficienciaVelocidad}%`,
        `${m.tasaCalidad}%`,
        `${m.minutosProd}m`,
        m.pliegosBuenos.toLocaleString(),
        m.status === 'green' ? 'CUMPLE' : m.status === 'yellow' ? 'ALERTA' : 'BAJO META'
      ])
    : [['Sin máquinas registradas en este filtro', '-', '-', '-', '-', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: currentY,
    head: [['Máquina', 'Meta u/m', 'Meta Turno (675m)', 'Real u/m', 'Efic. Vel.', 'Calidad', 'T. Prod', 'U. Buenas', 'Estado']],
    body: machineTableBody,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 8) {
        const text = String(data.cell.raw);
        if (text === 'CUMPLE') data.cell.styles.textColor = [22, 101, 52];
        else if (text === 'ALERTA') data.cell.styles.textColor = [161, 98, 7];
        else if (text === 'BAJO META') data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  if (currentY > 210) {
    doc.addPage();
    currentY = 16;
  }

  // 2. Tabla de Eficiencia por Operador
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`2. EVALUACIÓN Y RENDIMIENTO DE OPERADORES (${params.operatorMetrics.length} operador(es))`, 14, currentY);
  currentY += 3;

  const operatorTableBody = params.operatorMetrics.length > 0
    ? params.operatorMetrics.map((op, i) => [
        `#${i + 1}`,
        op.operador,
        `${op.realUndMin} u/m`,
        `${op.metaUndMinEstimada} u/m`,
        `${op.eficienciaVelocidad}%`,
        `${op.tasaCalidad}%`,
        `${op.tasaMerma}%`,
        op.pliegosBuenos.toLocaleString(),
        op.pliegosMalos.toLocaleString(),
        `${op.minutosProd} min`
      ])
    : [['-', 'Sin registros de operadores para este filtro', '-', '-', '-', '-', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: currentY,
    head: [['Rnk', 'Operador', 'Vel. Real', 'Meta Est.', 'Efic. %', 'Calidad %', 'Merma %', 'U. Buenas', 'Scrap', 'Tiempo Prod']],
    body: operatorTableBody,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  if (currentY > 210) {
    doc.addPage();
    currentY = 16;
  }

  // 3. Distribución de Eventos
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('3. DESGLOSE DE TIEMPOS POR EVENTO / PARADAS REGISTRADAS', 14, currentY);
  currentY += 3;

  const eventTableBody = params.topEvents.length > 0
    ? params.topEvents.slice(0, 8).map(e => [
        e.proceso,
        e.esProduccion ? 'Producción Efectiva' : 'Parada / Inactividad',
        `${e.minutos} min`,
        `${e.porcentaje}%`,
        `${Math.round((e.minutos / 60) * 10) / 10} horas`
      ])
    : [['Sin eventos en el periodo filtrado', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: currentY,
    head: [['Evento / Proceso', 'Clasificación', 'Minutos', '% del Tiempo', 'Horas Totales']],
    body: eventTableBody,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  if (currentY > 235) {
    doc.addPage();
    currentY = 24;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('CONFORMIDAD Y CONTROL INTERNO', 14, currentY);
  currentY += 12;

  const signWidth = (pageWidth - 28) / 3;
  const signLabels = [
    'Auditor Interno de Calidad',
    'Supervisor de Turno',
    'Jefatura de Operaciones / Planta'
  ];

  signLabels.forEach((label, i) => {
    const x = 14 + i * signWidth;
    doc.setDrawColor(148, 163, 184);
    doc.line(x + 5, currentY, x + signWidth - 5, currentY);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(label, x + signWidth / 2, currentY + 5, { align: 'center' });
    doc.text('Fecha y Firma', x + signWidth / 2, currentY + 9, { align: 'center' });
  });

  return doc;
}

/**
 * Descarga directamente el archivo PDF oficial
 */
export function exportAuditReportToPdf(params: PdfAuditParams): void {
  const doc = buildAuditReportPdfDoc(params);
  const fileName = `Informe_Auditoria_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

/**
 * Imprime el formato exacto del PDF oficial mediante el diálogo de impresión nativo del navegador
 */
export function printAuditReportPdf(params: PdfAuditParams): void {
  const doc = buildAuditReportPdfDoc(params);
  
  // Agregar directiva de auto-impresión al PDF
  doc.autoPrint();

  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);

  // Crear un iframe temporal e invisible para imprimir directamente el documento PDF
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.left = '-9999px';
  printFrame.style.top = '-9999px';
  printFrame.style.width = '0px';
  printFrame.style.height = '0px';
  printFrame.style.border = '0';
  printFrame.src = blobUrl;

  const cleanup = () => {
    setTimeout(() => {
      try {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
        URL.revokeObjectURL(blobUrl);
      } catch {
        // Ignorar limpieza
      }
    }, 60000);
  };

  printFrame.onload = () => {
    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        cleanup();
      } catch {
        // En caso de bloqueo por el navegador, abrir el PDF en una pestaña con la directiva de impresión
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          printWindow.focus();
        } else {
          // Si el popup también es bloqueado, recurrir a la impresión del documento web estilizado
          window.print();
        }
        cleanup();
      }
    }, 300);
  };

  printFrame.onerror = () => {
    window.print();
    cleanup();
  };

  document.body.appendChild(printFrame);
}

export interface EventPdfParams {
  reportTitle?: string;
  auditorName: string;
  eventName: string;
  dateFilter: string;
  machineFilter: string;
  operatorFilter: string;
  shiftFilter: string;
  summary: {
    eventoNombre: string;
    esProduccion: boolean;
    totalMinutos: number;
    totalHoras: number;
    totalOcurrencias: number;
    duracionPromedioMin: number;
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
    }>;
    fechasImpacto: Array<{
      fecha: string;
      turno: string;
      minutos: number;
      horas: number;
      veces: number;
    }>;
    registrosFiltrados: Array<{
      odtcod: string;
      ODTDESCRIP: string;
      MaqDes: string;
      DesOperador: string;
      FECHAINI: string;
      HORAINI: string;
      FECHAFIN: string;
      HORAFIN: string;
      minutos: number;
      turno?: string;
    }>;
  };
}

export function buildEventAnalysisPdfDoc(params: EventPdfParams): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 16;

  // Encabezado Corporativo
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(14, currentY, pageWidth - 28, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('AUDITORÍA DE EVENTO Y REGISTRO DE PARADAS', 20, currentY + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`EVENTO: ${params.eventName.toUpperCase()} | ${params.summary.esProduccion ? 'TIEMPO EFECTIVO DE PRODUCCIÓN' : 'TIEMPO DE INACTIVIDAD / PARADA'}`, 20, currentY + 16);

  currentY += 28;

  // Metadatos
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PARÁMETROS DE AUDITORÍA Y FILTROS DEL EVENTO', 14, currentY);

  doc.setFont('helvetica', 'normal');
  currentY += 5;

  const col1X = 14;
  const col2X = 110;

  doc.text(`Título: ${params.reportTitle || 'Informe de Incidencia y Duración por Evento'}`, col1X, currentY);
  doc.text(`Fecha Emisión: ${new Date().toLocaleString()}`, col2X, currentY);
  currentY += 5;

  doc.text(`Auditor / Certificador: ${params.auditorName || 'Dpto. Control de Gestión & Auditoría'}`, col1X, currentY);
  doc.text(`Turno Filtrado: ${params.shiftFilter}`, col2X, currentY);
  currentY += 5;

  doc.text(`Máquina(s): ${params.machineFilter}`, col1X, currentY);
  doc.text(`Operador(es): ${params.operatorFilter}`, col2X, currentY);
  currentY += 5;

  doc.text(`Periodo Analizado: ${params.dateFilter}`, col1X, currentY);
  doc.text(`Tipo: ${params.summary.esProduccion ? 'Producción' : 'Parada No Productiva'}`, col2X, currentY);

  currentY += 8;

  // Tarjetas Resumen KPIs del Evento
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, pageWidth - 28, 24, 2, 2, 'FD');

  const cardWidth = (pageWidth - 28) / 4;
  const kpis = [
    { label: 'TIEMPO TOTAL', val: `${params.summary.totalMinutos}m`, sub: `${params.summary.totalHoras} hrs` },
    { label: 'OCURRENCIAS', val: `${params.summary.totalOcurrencias}`, sub: 'Registros' },
    { label: 'DURACIÓN PROM.', val: `${params.summary.duracionPromedioMin}m`, sub: 'Por evento' },
    { label: '% IMPACTO PLANTA', val: `${params.summary.porcentajeSobreTotalPlanta}%`, sub: 'Del tiempo total' },
  ];

  kpis.forEach((item, i) => {
    const x = 14 + i * cardWidth;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, x + cardWidth / 2, currentY + 6, { align: 'center' });

    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(item.val, x + cardWidth / 2, currentY + 14, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(item.sub, x + cardWidth / 2, currentY + 20, { align: 'center' });

    if (i < 3) {
      doc.setDrawColor(226, 232, 240);
      doc.line(x + cardWidth, currentY + 3, x + cardWidth, currentY + 21);
    }
  });

  currentY += 28;

  // 1. Desglose por Máquina
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`1. IMPACTO Y DURACIÓN POR MÁQUINA (${params.summary.maquinasImpacto.length} máquina(s) involucrada(s))`, 14, currentY);
  currentY += 3;

  const machineTableBody = params.summary.maquinasImpacto.length > 0
    ? params.summary.maquinasImpacto.map(m => [
        m.maqDes,
        `${m.minutos} min`,
        `${m.horas} h`,
        `${m.veces} veces`,
        `${m.porcentajeDelEvento}%`,
        `${m.duracionPromedioMin} min`,
        m.operadoresInvolucrados.join(', ') || 'N/A'
      ])
    : [['Sin registros para los filtros seleccionados', '-', '-', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: currentY,
    head: [['Máquina', 'Minutos', 'Horas', 'Ocurrencias', '% del Evento', 'Promedio', 'Operadores Involucrados']],
    body: machineTableBody,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  if (currentY > 210) {
    doc.addPage();
    currentY = 16;
  }

  // 2. Desglose por Operador
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`2. DISTRIBUCIÓN POR OPERADOR (${params.summary.operadoresImpacto.length} operador(es))`, 14, currentY);
  currentY += 3;

  const operatorTableBody = params.summary.operadoresImpacto.length > 0
    ? params.summary.operadoresImpacto.map(op => [
        op.operador,
        `${op.minutos} min`,
        `${op.horas} h`,
        `${op.veces} veces`,
        `${op.porcentajeDelEvento}%`,
        `${op.duracionPromedioMin} min`
      ])
    : [['Sin operadores en este filtro', '-', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: currentY,
    head: [['Operador', 'Minutos', 'Horas', 'Ocurrencias', '% del Evento', 'Duración Prom.']],
    body: operatorTableBody,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  if (currentY > 210) {
    doc.addPage();
    currentY = 16;
  }

  // 3. Desglose por Fechas
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`3. CRONOLOGÍA POR FECHAS Y TURNOS (${params.summary.fechasImpacto.length} fecha(s))`, 14, currentY);
  currentY += 3;

  const dateTableBody = params.summary.fechasImpacto.length > 0
    ? params.summary.fechasImpacto.slice(0, 15).map(d => [
        d.fecha,
        d.turno === 'NOCHE' ? 'Noche' : 'Día',
        `${d.minutos} min`,
        `${d.horas} h`,
        `${d.veces} veces`
      ])
    : [['Sin fechas registradas', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: currentY,
    head: [['Fecha Operativa', 'Turno', 'Minutos', 'Horas', 'Ocurrencias']],
    body: dateTableBody,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 4. Bitácora de Ocurrencias
  if (params.summary.registrosFiltrados.length > 0) {
    if (currentY > 210) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`4. BITÁCORA DE REGISTROS (${params.summary.registrosFiltrados.length} ocurrencias)`, 14, currentY);
    currentY += 3;

    const detailTableBody = params.summary.registrosFiltrados.slice(0, 20).map((r, i) => [
      `#${i + 1}`,
      r.odtcod,
      r.MaqDes,
      r.DesOperador,
      r.FECHAINI,
      `${r.HORAINI} - ${r.HORAFIN || ''}`,
      `${r.minutos} min`,
      r.turno || 'DIA'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'OP', 'Máquina', 'Operador', 'Fecha', 'Horario', 'Duración', 'Turno']],
      body: detailTableBody,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.8, textColor: [30, 41, 59] },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  // Firmas de Conformidad
  if (currentY > 235) {
    doc.addPage();
    currentY = 24;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('CONFORMIDAD Y CONTROL DE AUDITORÍA', 14, currentY);
  currentY += 12;

  const signWidth = (pageWidth - 28) / 3;
  const signLabels = [
    'Auditor / Responsable de Calidad',
    'Jefatura de Mantenimiento / Turno',
    'Dirección de Operaciones / Planta'
  ];

  signLabels.forEach((label, i) => {
    const x = 14 + i * signWidth;
    doc.setDrawColor(148, 163, 184);
    doc.line(x + 5, currentY, x + signWidth - 5, currentY);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(label, x + signWidth / 2, currentY + 5, { align: 'center' });
    doc.text('Fecha y Firma', x + signWidth / 2, currentY + 9, { align: 'center' });
  });

  return doc;
}

export function exportEventAnalysisToPdf(params: EventPdfParams): void {
  const doc = buildEventAnalysisPdfDoc(params);
  const cleanEvent = params.eventName.replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 20);
  const fileName = `Informe_Evento_${cleanEvent}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

export function printEventAnalysisPdf(params: EventPdfParams): void {
  const doc = buildEventAnalysisPdfDoc(params);
  doc.autoPrint();

  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);

  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.left = '-9999px';
  printFrame.style.top = '-9999px';
  printFrame.style.width = '0px';
  printFrame.style.height = '0px';
  printFrame.style.border = '0';
  printFrame.src = blobUrl;

  const cleanup = () => {
    setTimeout(() => {
      try {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
        URL.revokeObjectURL(blobUrl);
      } catch {
        // Ignorar
      }
    }, 60000);
  };

  printFrame.onload = () => {
    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        cleanup();
      } catch {
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          printWindow.focus();
        } else {
          window.print();
        }
        cleanup();
      }
    }, 300);
  };

  printFrame.onerror = () => {
    window.print();
    cleanup();
  };

  document.body.appendChild(printFrame);
}


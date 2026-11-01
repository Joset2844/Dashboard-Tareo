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

export function exportAuditReportToPdf(params: PdfAuditParams): void {
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

  const fileName = `Informe_Auditoria_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

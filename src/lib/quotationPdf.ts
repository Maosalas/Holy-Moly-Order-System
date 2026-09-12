import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCRC, formatDate } from "@/types/quote";

export interface QuotationPdfData {
  number: string;
  orgName?: string | null;
  orgLogoUrl?: string | null;
  clientName: string;
  clientPhone?: string | null;
  quoteDate: string;
  validUntil?: string | null;
  deliveryDate?: string | null;
  items: { description: string; qty: number; unitPrice: number; lineTotal: number }[];
  extras: { name: string; qty: number; unitPrice: number; total: number }[];
  packagingTotal: number;
  rushSurcharge: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  depositPct: number;
  depositAmount: number;
  clientNotes?: string | null;
}

const loadImage = (url: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

/** Genera el PDF de la cotización. Solo campos visibles para el cliente. */
export const buildQuotationPdf = async (q: QuotationPdfData) => {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 40;
  let y = margin;

  if (q.orgLogoUrl) {
    const img = await loadImage(q.orgLogoUrl);
    if (img) {
      const w = 90;
      const h = (img.height / img.width) * w;
      try {
        doc.addImage(img, "PNG", margin, y, w, Math.min(h, 60));
      } catch {
        /* logo opcional */
      }
    }
  }

  doc.setFontSize(18);
  doc.text(q.orgName || "Cotización", margin + 110, y + 18);
  doc.setFontSize(11);
  doc.text(`Cotización ${q.number}`, margin + 110, y + 36);

  doc.setFontSize(10);
  doc.text(`Fecha: ${formatDate(q.quoteDate)}`, 420, y + 18);
  doc.text(`Vigencia: ${formatDate(q.validUntil)}`, 420, y + 32);
  if (q.deliveryDate) doc.text(`Entrega: ${formatDate(q.deliveryDate)}`, 420, y + 46);

  y += 80;
  doc.setFontSize(11);
  doc.text("Cliente", margin, y);
  doc.setFontSize(10);
  doc.text(q.clientName, margin, y + 15);
  if (q.clientPhone) doc.text(q.clientPhone, margin, y + 29);
  y += 50;

  autoTable(doc, {
    startY: y,
    head: [["Descripción", "Cantidad", "Precio unitario", "Total"]],
    body: q.items.map((i) => [
      i.description,
      String(i.qty),
      formatCRC(i.unitPrice),
      formatCRC(i.lineTotal),
    ]),
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [40, 40, 40] },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 16;

  const extraRows: string[][] = [];
  if (q.packagingTotal > 0) extraRows.push(["Empaque", "1", formatCRC(q.packagingTotal), formatCRC(q.packagingTotal)]);
  q.extras.forEach((e) => extraRows.push([e.name, String(e.qty), formatCRC(e.unitPrice), formatCRC(e.total)]));
  if (q.rushSurcharge > 0) extraRows.push(["Recargo por urgencia", "1", formatCRC(q.rushSurcharge), formatCRC(q.rushSurcharge)]);

  if (extraRows.length) {
    autoTable(doc, {
      startY: y,
      head: [["Empaque y extras", "Cantidad", "Precio unitario", "Total"]],
      body: extraRows,
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [90, 90, 90] },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 16;
  }

  const totals: string[][] = [];
  if (q.discountAmount > 0) totals.push(["Descuento", `- ${formatCRC(q.discountAmount)}`]);
  if (q.taxAmount > 0) totals.push(["Impuesto", formatCRC(q.taxAmount)]);
  totals.push(["Total", formatCRC(q.total)]);
  totals.push([`Anticipo (${q.depositPct}%)`, formatCRC(q.depositAmount)]);

  autoTable(doc, {
    startY: y,
    body: totals,
    theme: "plain",
    styles: { fontSize: 11, cellPadding: 4 },
    columnStyles: { 0: { halign: "right", cellWidth: 380 }, 1: { halign: "right", fontStyle: "bold" } },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 24;

  if (q.clientNotes) {
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(q.clientNotes, 520), margin, y);
    y += 30;
  }

  doc.setFontSize(10);
  doc.text(`Cotización válida hasta el ${formatDate(q.validUntil)}`, margin, y);

  return doc;
};

export const downloadQuotationPdf = async (q: QuotationPdfData) => {
  const doc = await buildQuotationPdf(q);
  doc.save(`${q.number || "cotizacion"}.pdf`);
};

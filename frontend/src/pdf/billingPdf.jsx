import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";

import { listWorkOrderMaterials, listWorkOrderParts } from "../api/inventoryApi.js";
import { getWorkshopProfile } from "../api/settingsApi.js";
import { getWorkOrder, listWorkOrderTasks } from "../api/workOrdersApi.js";

const BLUE = "#0B84F3";
const DARK = "#202124";
const GRAY = "#7A7A7A";
const LIGHT = "#F4F6FA";
const BORDER = "#D9DDE7";
const RED = "#FF2D2D";

const moneyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

function money(value) {
  return moneyFormatter.format(Number(value || 0));
}

function plainNumber(value) {
  const amount = Number(value || 0);
  return Number.isInteger(amount) ? String(amount) : amount.toLocaleString("es-AR");
}

function date(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("es-AR");
}

function minutes(value) {
  const total = Number(value || 0);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

function normalizeList(data) {
  return Array.isArray(data) ? data : data?.results || [];
}

function statusLabel(value) {
  const labels = {
    pending: "Pendiente",
    approved: "Aprobado",
    rejected: "Rechazado",
    partial: "Parcial",
    paid: "Pagado",
    cancelled: "Cancelado",
  };
  return labels[value] || value || "-";
}

function buildItems({ tasks, parts, materials, extraDescription, extraAmount }) {
  const rows = [];

  normalizeList(tasks)
    .filter((task) => task.status !== "cancelled")
    .forEach((task) => {
      rows.push({
        title: task.title || task.task_template_name || "Tarea",
        detail: [task.description, task.operator_name ? `Operario: ${task.operator_name}` : "", minutes(task.estimated_minutes)]
          .filter(Boolean)
          .join(" | "),
        price: money(task.labor_cost),
        qty: "1",
        total: money(task.labor_cost),
      });
    });

  normalizeList(parts)
    .filter((item) => item.status !== "returned")
    .forEach((item) => {
      rows.push({
        title: item.part_name || "Repuesto",
        detail: `Repuesto ${item.part_code || ""}`.trim(),
        price: money(item.unit_cost),
        qty: plainNumber(item.quantity),
        total: money(item.total_cost),
      });
    });

  normalizeList(materials)
    .filter((item) => item.status !== "returned")
    .forEach((item) => {
      rows.push({
        title: item.material_name || "Material",
        detail: `Material ${item.material_code || ""}`.trim(),
        price: money(item.unit_cost),
        qty: plainNumber(item.quantity),
        total: money(item.total_cost),
      });
    });

  if (Number(extraAmount || 0) > 0) {
    rows.push({
      title: extraDescription || "Adicional",
      detail: "Item adicional",
      price: money(extraAmount),
      qty: "1",
      total: money(extraAmount),
    });
  }

  return rows.length ? rows : [{ title: "Sin items registrados", detail: "", price: money(0), qty: "-", total: money(0) }];
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function Header({ profile }) {
  return (
    <View style={styles.header}>
      <View style={styles.topBar} />
      <View style={styles.brandPanel}>
        {profile.logo_url ? <Image src={profile.logo_url} style={styles.logo} /> : <Text style={styles.brand}>{profile.name || "AutoFlow Taller"}</Text>}
      </View>
      <View style={styles.contactRow}>
        <View style={styles.contactItem}>
          <Text style={styles.icon}>@</Text>
          <View>
            <Text style={styles.contactText}>{profile.email_from_address || profile.email || "-"}</Text>
            <Text style={styles.contactText}>{profile.email || ""}</Text>
          </View>
        </View>
        <View style={styles.contactItem}>
          <Text style={styles.icon}>T</Text>
          <View>
            <Text style={styles.contactText}>{profile.phone || profile.whatsapp || "-"}</Text>
            <Text style={styles.contactText}>Lunes a viernes</Text>
          </View>
        </View>
        <View style={styles.contactItem}>
          <Text style={styles.icon}>P</Text>
          <View>
            <Text style={styles.contactText}>{profile.address || "Direccion del taller"}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function SummaryCard({ documentType, number, issueDate, total }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>{documentType === "invoice" ? "Factura No:" : "Presupuesto No:"}</Text>
        <Text style={styles.summaryValue}>{number}</Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Fecha:</Text>
        <Text style={styles.summaryValue}>{date(issueDate)}</Text>
      </View>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Total:</Text>
        <Text style={styles.summaryValue}>{money(total)}</Text>
      </View>
    </View>
  );
}

function ItemsTable({ items }) {
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHeader]}>
        <Text style={[styles.th, styles.itemCol]}>Item</Text>
        <Text style={[styles.th, styles.priceCol]}>Precio</Text>
        <Text style={[styles.th, styles.qtyCol]}>Cant.</Text>
        <Text style={[styles.th, styles.totalCol]}>Total</Text>
      </View>
      {items.map((item, index) => (
        <View key={`${item.title}-${index}`} style={[styles.tableRow, index % 2 === 0 ? styles.altRow : null]}>
          <View style={styles.itemCol}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            {item.detail ? <Text style={styles.itemDetail}>{item.detail}</Text> : null}
          </View>
          <Text style={[styles.td, styles.priceCol]}>{item.price}</Text>
          <Text style={[styles.td, styles.qtyCol]}>{item.qty}</Text>
          <Text style={[styles.td, styles.totalCol]}>{item.total}</Text>
        </View>
      ))}
    </View>
  );
}

function PaymentBlock({ documentType, record, workOrder, profile }) {
  const rows = documentType === "invoice"
    ? [
        ["Estado:", statusLabel(record.payment_status)],
        ["Orden de trabajo:", workOrder.order_number || record.work_order_number],
        ["Presupuesto:", record.estimate ? "Asociado" : "Sin presupuesto asociado"],
      ]
    : [
        ["Contacto:", profile.email || profile.email_from_address || profile.phone || "-"],
        ["Orden de trabajo:", workOrder.order_number || record.work_order_number],
        ["Validez:", "Valores sujetos a disponibilidad de repuestos y materiales."],
        ["Entrega estimada:", date(workOrder.estimated_delivery_date)],
      ];

  return (
    <View style={styles.paymentBlock}>
      <Text style={styles.blockTitle}>{documentType === "invoice" ? "Datos de pago:" : "Medios y condiciones:"}</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.blockRow}>
          <Text style={styles.blockLabel}>{label}</Text>
          <Text style={styles.blockText}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function TotalsBlock({ documentType, record }) {
  const baseSubtotal = Number(record.labor_amount || 0) + Number(record.materials_amount || 0) + Number(record.parts_amount || 0);
  const rows = documentType === "invoice"
    ? [
        ["Sub Total", record.subtotal, "dark"],
        [`Descuento ${record.discount_percent || 0}%`, record.discount_amount, "red"],
        [`IVA ${record.tax_percent || 0}%`, record.tax_amount, "dark"],
        ["Cobrado", record.paid_amount, "dark"],
        ["Saldo", record.balance_due, "dark"],
      ]
    : [
        ["Sub Total", baseSubtotal, "dark"],
        ["Adicional", record.extra_amount, "dark"],
      ];
  const grandTotal = documentType === "invoice" ? record.total : record.total_amount;

  return (
    <View style={styles.totalsBlock}>
      {rows.map(([label, value, color]) => (
        <View key={label} style={styles.totalRow}>
          <Text style={[styles.totalLabel, color === "red" ? styles.red : null]}>{label}</Text>
          <Text style={[styles.totalValue, color === "red" ? styles.red : null]}>{money(value)}</Text>
        </View>
      ))}
      <View style={styles.grandRow}>
        <Text style={styles.grandLabel}>Gran Total</Text>
        <Text style={styles.grandValue}>{money(grandTotal)}</Text>
      </View>
    </View>
  );
}

function BillingPdfDocument({ documentType, record, workOrder, tasks, parts, materials, profile }) {
  const title = documentType === "invoice" ? (profile.invoice_header_title || "Factura") : (profile.estimate_header_title || "Presupuesto");
  const number = documentType === "invoice" ? record.invoice_number : record.work_order_number;
  const issueDate = documentType === "invoice" ? record.issued_at : record.created_at;
  const total = documentType === "invoice" ? record.total : record.total_amount;
  const items = buildItems({
    tasks,
    parts,
    materials,
    extraDescription: record.extra_description,
    extraAmount: record.extra_amount,
  });

  return (
    <Document title={`${title} ${number}`}>
      <Page size="A4" style={styles.page}>
        <Header profile={profile} />

        <View style={styles.content}>
          <View style={styles.intro}>
            <View style={styles.recipient}>
              <Text style={styles.recipientLabel}>{documentType === "invoice" ? "Factura a:" : "Presupuesto a:"}</Text>
              <Text style={styles.recipientName}>{record.client_name || workOrder.client_name || "-"}</Text>
              <Text style={styles.recipientText}>{workOrder.vehicle_label || "-"}</Text>
              <Text style={styles.recipientText}>Orden: {workOrder.order_number || record.work_order_number}</Text>
              <Text style={styles.recipientText}>Estado: {statusLabel(documentType === "invoice" ? record.payment_status : record.status)}</Text>
            </View>
            <View style={styles.titleArea}>
              <Text style={styles.title}>{title.toUpperCase()}</Text>
              <SummaryCard documentType={documentType} number={number} issueDate={issueDate} total={total} />
            </View>
          </View>

          <ItemsTable items={items} />

          <View style={styles.bottomArea}>
            <PaymentBlock documentType={documentType} record={record} workOrder={workOrder} profile={profile} />
            <TotalsBlock documentType={documentType} record={record} />
          </View>

          <View style={styles.signature}>
            <Text style={styles.signatureText}>Firma</Text>
            <Text style={styles.signatureLabel}>{documentType === "invoice" ? "Responsable administrativo" : "Conformidad del cliente"}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.footerThanks}>Gracias por su preferencia.</Text>
            <Text style={styles.footerTitle}>Terminos y condiciones</Text>
            <Text style={styles.footerText}>{profile.document_footer || "Documento generado por AutoFlow."}</Text>
          </View>
          <Text style={styles.footerBrand}>{profile.name || "AutoFlow Taller"}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadBillingPdf({ documentType, record, filename }) {
  const workOrderId = record.work_order;
  const [profile, workOrder, tasks, parts, materials] = await Promise.all([
    getWorkshopProfile(),
    getWorkOrder(workOrderId),
    listWorkOrderTasks(workOrderId),
    listWorkOrderParts({ work_order: workOrderId, page_size: 100 }),
    listWorkOrderMaterials({ work_order: workOrderId, page_size: 100 }),
  ]);

  const blob = await pdf(
    <BillingPdfDocument
      documentType={documentType}
      record={record}
      workOrder={workOrder}
      tasks={tasks}
      parts={parts}
      materials={materials}
      profile={profile}
    />,
  ).toBlob();

  downloadBlob(blob, filename);
}

const styles = StyleSheet.create({
  page: {
    position: "relative",
    paddingTop: 112,
    paddingHorizontal: 36,
    paddingBottom: 96,
    fontFamily: "Helvetica",
    color: DARK,
    backgroundColor: "#FFFFFF",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 96,
  },
  topBar: {
    height: 28,
    backgroundColor: BLUE,
  },
  brandPanel: {
    position: "absolute",
    top: 28,
    left: 0,
    width: 182,
    height: 68,
    backgroundColor: BLUE,
    justifyContent: "center",
    alignItems: "center",
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 700,
  },
  logo: {
    maxWidth: 112,
    maxHeight: 42,
    objectFit: "contain",
  },
  contactRow: {
    position: "absolute",
    top: 46,
    left: 224,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  contactItem: {
    flexDirection: "row",
    gap: 7,
    width: 112,
  },
  icon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BLUE,
    color: "#FFFFFF",
    fontSize: 8,
    textAlign: "center",
    paddingTop: 5,
  },
  contactText: {
    color: GRAY,
    fontSize: 8,
    lineHeight: 1.35,
  },
  content: {
    gap: 14,
  },
  intro: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 18,
  },
  recipient: {
    width: 145,
    gap: 5,
  },
  recipientLabel: {
    fontSize: 10,
    fontWeight: 700,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: 700,
  },
  recipientText: {
    color: GRAY,
    fontSize: 9,
    lineHeight: 1.35,
  },
  titleArea: {
    flex: 1,
  },
  title: {
    color: "#B8B8B8",
    fontSize: 34,
    textAlign: "center",
    marginBottom: 8,
  },
  summaryCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#F8F9FC",
  },
  summaryCell: {
    flex: 1,
    padding: 10,
    gap: 4,
  },
  summaryLabel: {
    color: GRAY,
    fontSize: 9,
  },
  summaryValue: {
    color: BLUE,
    fontSize: 12,
    fontWeight: 700,
  },
  table: {
    borderWidth: 1,
    borderColor: BORDER,
  },
  tableRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableHeader: {
    minHeight: 28,
    backgroundColor: "#FFFFFF",
  },
  altRow: {
    backgroundColor: LIGHT,
  },
  th: {
    fontSize: 10,
    fontWeight: 700,
    paddingHorizontal: 10,
  },
  td: {
    fontSize: 9,
    paddingHorizontal: 10,
    textAlign: "right",
  },
  itemCol: {
    width: 300,
    paddingHorizontal: 10,
  },
  priceCol: {
    width: 86,
    textAlign: "right",
  },
  qtyCol: {
    width: 58,
    textAlign: "right",
  },
  totalCol: {
    width: 88,
    textAlign: "right",
  },
  itemTitle: {
    fontSize: 10.2,
    lineHeight: 1.35,
  },
  itemDetail: {
    color: GRAY,
    fontSize: 8.2,
    lineHeight: 1.3,
    marginTop: 3,
  },
  bottomArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 22,
  },
  paymentBlock: {
    width: 230,
    gap: 5,
  },
  blockTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 2,
  },
  blockRow: {
    gap: 2,
  },
  blockLabel: {
    fontSize: 9,
    fontWeight: 700,
  },
  blockText: {
    color: GRAY,
    fontSize: 9,
    lineHeight: 1.3,
  },
  totalsBlock: {
    width: 240,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  totalLabel: {
    fontSize: 9.5,
    fontWeight: 700,
  },
  totalValue: {
    fontSize: 9.5,
    fontWeight: 700,
  },
  red: {
    color: RED,
    fontWeight: 400,
  },
  grandRow: {
    flexDirection: "row",
    backgroundColor: BLUE,
    marginTop: 4,
  },
  grandLabel: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: 700,
    padding: 10,
  },
  grandValue: {
    width: 118,
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: 700,
    textAlign: "right",
    padding: 10,
    borderLeftWidth: 1,
    borderLeftColor: "#FFFFFF",
  },
  signature: {
    alignSelf: "flex-end",
    width: 190,
    marginTop: 14,
    alignItems: "center",
  },
  signatureText: {
    fontSize: 22,
    fontStyle: "italic",
  },
  signatureLabel: {
    color: GRAY,
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 36,
    paddingTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerThanks: {
    color: BLUE,
    fontSize: 13,
    marginBottom: 10,
  },
  footerTitle: {
    fontSize: 8,
    fontWeight: 700,
    marginBottom: 5,
  },
  footerText: {
    color: GRAY,
    fontSize: 7,
    maxWidth: 330,
  },
  footerBrand: {
    alignSelf: "center",
    fontSize: 11,
    fontWeight: 700,
  },
});

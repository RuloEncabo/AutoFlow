from __future__ import annotations

from decimal import Decimal
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from django.http import HttpResponse
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from apps.core.services import get_workshop_profile


PRIMARY = colors.HexColor("#007CB7")
TEXT = colors.HexColor("#2F2B3D")
MUTED = colors.HexColor("#6D6777")
BORDER = colors.HexColor("#DBDADE")
LIGHT_BG = colors.HexColor("#F8F7FA")


def _styles():
    base = getSampleStyleSheet()
    base.add(ParagraphStyle(name="DocTitle", parent=base["Title"], fontName="Helvetica-Bold", fontSize=18, textColor=PRIMARY, alignment=2, spaceAfter=8))
    base.add(ParagraphStyle(name="Section", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=11, textColor=TEXT, spaceBefore=12, spaceAfter=6))
    base.add(ParagraphStyle(name="SmallMuted", parent=base["BodyText"], fontSize=8, textColor=MUTED, leading=10))
    base.add(ParagraphStyle(name="Cell", parent=base["BodyText"], fontSize=8.5, textColor=TEXT, leading=10))
    base.add(ParagraphStyle(name="CellBold", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=8.5, textColor=TEXT, leading=10))
    return base


def _p(value, style):
    text = "" if value is None else str(value)
    return Paragraph(escape(text).replace("\n", "<br/>"), style)


def _money(value):
    amount = Decimal(str(value or 0))
    return f"$ {amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _date(value):
    if not value:
        return "-"
    if hasattr(value, "date"):
        value = timezone.localtime(value).date() if hasattr(value, "tzinfo") else value.date()
    return value.strftime("%d/%m/%Y")


def _datetime(value):
    if not value:
        return "-"
    if hasattr(value, "tzinfo"):
        value = timezone.localtime(value)
    return value.strftime("%d/%m/%Y %H:%M")


def _table(data, widths=None, header=True):
    table = Table(data, colWidths=widths, hAlign="LEFT")
    style = [
        ("BOX", (0, 0), (-1, -1), 0.7, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]
    if header:
        style.extend([
            ("BACKGROUND", (0, 0), (-1, 0), LIGHT_BG),
            ("TEXTCOLOR", (0, 0), (-1, 0), TEXT),
        ])
    table.setStyle(TableStyle(style))
    return table


def _header(elements, title):
    profile = get_workshop_profile()
    styles = _styles()
    left = []
    if profile.logo:
        logo_path = Path(profile.logo.path)
        if logo_path.exists():
            left.append(Image(str(logo_path), width=34 * mm, height=20 * mm, kind="proportional"))
    left.extend([
        _p(profile.name, styles["CellBold"]),
        _p(profile.address, styles["SmallMuted"]),
        _p(f"Tel: {profile.phone}" if profile.phone else "", styles["SmallMuted"]),
        _p(f"WhatsApp: {profile.whatsapp}" if profile.whatsapp else "", styles["SmallMuted"]),
        _p(profile.email, styles["SmallMuted"]),
    ])

    header = Table(
        [[left, [_p(title, styles["DocTitle"]), _p(f"Emitido: {_datetime(timezone.now())}", styles["SmallMuted"])]]],
        colWidths=[95 * mm, 75 * mm],
    )
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LINEBELOW", (0, 0), (-1, -1), 1, PRIMARY),
    ]))
    elements.append(header)
    elements.append(Spacer(1, 8))


def _footer(elements):
    profile = get_workshop_profile()
    if profile.document_footer:
        styles = _styles()
        elements.append(Spacer(1, 10))
        elements.append(_p(profile.document_footer, styles["SmallMuted"]))


def _build_pdf(title, body_builder):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )
    elements = []
    _header(elements, title)
    body_builder(elements, _styles())
    _footer(elements)
    doc.build(elements)
    return buffer.getvalue()


def _filename(value):
    return "".join(char if char.isalnum() or char in {"-", "_"} else "_" for char in str(value))


def pdf_response(content: bytes, filename: str):
    response = HttpResponse(content, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{_filename(filename)}.pdf"'
    return response


def generate_work_order_pdf(work_order):
    profile = get_workshop_profile()

    def body(elements, styles):
        elements.append(_p("Datos principales", styles["Section"]))
        elements.append(_table([
            [_p("Orden", styles["CellBold"]), _p(work_order.order_number, styles["Cell"]), _p("Estado", styles["CellBold"]), _p(work_order.get_status_display(), styles["Cell"])],
            [_p("Cliente", styles["CellBold"]), _p(work_order.client.full_name, styles["Cell"]), _p("Vehiculo", styles["CellBold"]), _p(f"{work_order.vehicle.plate} - {work_order.vehicle.brand} {work_order.vehicle.model}", styles["Cell"])],
            [_p("Ingreso", styles["CellBold"]), _p(_datetime(work_order.entry_date), styles["Cell"]), _p("Entrega estimada", styles["CellBold"]), _p(_date(work_order.estimated_delivery_date), styles["Cell"])],
            [_p("Prioridad", styles["CellBold"]), _p(work_order.get_priority_display(), styles["Cell"]), _p("Patente", styles["CellBold"]), _p(work_order.vehicle.plate, styles["Cell"])],
        ], widths=[28 * mm, 58 * mm, 34 * mm, 50 * mm], header=False))
        elements.append(_p("Descripcion", styles["Section"]))
        elements.append(_p(work_order.description or "-", styles["Cell"]))
        if work_order.notes:
            elements.append(_p("Observaciones", styles["Section"]))
            elements.append(_p(work_order.notes, styles["Cell"]))

        tasks = list(work_order.tasks.all())
        elements.append(_p("Tareas", styles["Section"]))
        task_rows = [[_p("Tarea", styles["CellBold"]), _p("Operario", styles["CellBold"]), _p("Sector", styles["CellBold"]), _p("Estado", styles["CellBold"])]]
        for task in tasks:
            task_rows.append([
                _p(task.title, styles["Cell"]),
                _p(task.operator.full_name if task.operator else "-", styles["Cell"]),
                _p(task.sector or "-", styles["Cell"]),
                _p(task.get_status_display(), styles["Cell"]),
            ])
        if len(task_rows) == 1:
            task_rows.append([_p("Sin tareas registradas", styles["Cell"]), "", "", ""])
        elements.append(_table(task_rows, widths=[60 * mm, 45 * mm, 33 * mm, 32 * mm]))

        elements.append(_p("Repuestos y materiales", styles["Section"]))
        item_rows = [[_p("Tipo", styles["CellBold"]), _p("Codigo", styles["CellBold"]), _p("Detalle", styles["CellBold"]), _p("Cantidad", styles["CellBold"]), _p("Total", styles["CellBold"])]]
        for item in work_order.parts.select_related("part").all():
            item_rows.append([_p("Repuesto", styles["Cell"]), _p(item.part.code, styles["Cell"]), _p(item.part.name, styles["Cell"]), _p(item.quantity, styles["Cell"]), _p(_money(item.total_cost), styles["Cell"])])
        for item in work_order.materials.select_related("material").all():
            item_rows.append([_p("Material", styles["Cell"]), _p(item.material.code, styles["Cell"]), _p(item.material.name, styles["Cell"]), _p(item.quantity, styles["Cell"]), _p(_money(item.total_cost), styles["Cell"])])
        if len(item_rows) == 1:
            item_rows.append([_p("Sin consumos registrados", styles["Cell"]), "", "", "", ""])
        elements.append(_table(item_rows, widths=[25 * mm, 32 * mm, 63 * mm, 25 * mm, 25 * mm]))

    return _build_pdf(profile.order_header_title, body)


def generate_estimate_pdf(estimate):
    profile = get_workshop_profile()
    work_order = estimate.work_order

    def body(elements, styles):
        elements.append(_p("Datos del presupuesto", styles["Section"]))
        elements.append(_table([
            [_p("Orden", styles["CellBold"]), _p(work_order.order_number, styles["Cell"]), _p("Estado", styles["CellBold"]), _p(estimate.get_status_display(), styles["Cell"])],
            [_p("Cliente", styles["CellBold"]), _p(work_order.client.full_name, styles["Cell"]), _p("Vehiculo", styles["CellBold"]), _p(f"{work_order.vehicle.plate} - {work_order.vehicle.brand} {work_order.vehicle.model}", styles["Cell"])],
            [_p("Creado", styles["CellBold"]), _p(_datetime(estimate.created_at), styles["Cell"]), _p("Aprobado", styles["CellBold"]), _p(_datetime(estimate.approved_at), styles["Cell"])],
        ], widths=[28 * mm, 58 * mm, 34 * mm, 50 * mm], header=False))

        elements.append(_p("Importes", styles["Section"]))
        elements.append(_table([
            [_p("Concepto", styles["CellBold"]), _p("Importe", styles["CellBold"])],
            [_p("Mano de obra", styles["Cell"]), _p(_money(estimate.labor_amount), styles["Cell"])],
            [_p("Materiales", styles["Cell"]), _p(_money(estimate.materials_amount), styles["Cell"])],
            [_p("Repuestos", styles["Cell"]), _p(_money(estimate.parts_amount), styles["Cell"])],
            [_p("Total final", styles["CellBold"]), _p(_money(estimate.total_amount), styles["CellBold"])],
        ], widths=[120 * mm, 50 * mm]))
        elements.append(_p("Descripcion de la orden", styles["Section"]))
        elements.append(_p(work_order.description or "-", styles["Cell"]))

    return _build_pdf(profile.estimate_header_title, body)


def generate_invoice_pdf(invoice):
    profile = get_workshop_profile()
    work_order = invoice.work_order

    def body(elements, styles):
        elements.append(_p("Datos de la factura", styles["Section"]))
        elements.append(_table([
            [_p("Factura", styles["CellBold"]), _p(invoice.invoice_number, styles["Cell"]), _p("Estado pago", styles["CellBold"]), _p(invoice.get_payment_status_display(), styles["Cell"])],
            [_p("Orden", styles["CellBold"]), _p(work_order.order_number, styles["Cell"]), _p("Fecha emision", styles["CellBold"]), _p(_datetime(invoice.issued_at), styles["Cell"])],
            [_p("Cliente", styles["CellBold"]), _p(work_order.client.full_name, styles["Cell"]), _p("Vehiculo", styles["CellBold"]), _p(f"{work_order.vehicle.plate} - {work_order.vehicle.brand} {work_order.vehicle.model}", styles["Cell"])],
        ], widths=[28 * mm, 58 * mm, 34 * mm, 50 * mm], header=False))

        elements.append(_p("Totales", styles["Section"]))
        elements.append(_table([
            [_p("Concepto", styles["CellBold"]), _p("Importe", styles["CellBold"])],
            [_p("Total facturado", styles["Cell"]), _p(_money(invoice.total), styles["Cell"])],
            [_p("Total pagado", styles["Cell"]), _p(_money(invoice.paid_amount), styles["Cell"])],
            [_p("Saldo", styles["CellBold"]), _p(_money(Decimal(invoice.total) - Decimal(invoice.paid_amount)), styles["CellBold"])],
        ], widths=[120 * mm, 50 * mm]))

        payments = list(invoice.payments.all())
        elements.append(_p("Pagos", styles["Section"]))
        rows = [[_p("Fecha", styles["CellBold"]), _p("Metodo", styles["CellBold"]), _p("Referencia", styles["CellBold"]), _p("Monto", styles["CellBold"])]]
        for payment in payments:
            rows.append([_p(_datetime(payment.paid_at), styles["Cell"]), _p(payment.get_method_display(), styles["Cell"]), _p(payment.reference or "-", styles["Cell"]), _p(_money(payment.amount), styles["Cell"])])
        if len(rows) == 1:
            rows.append([_p("Sin pagos registrados", styles["Cell"]), "", "", ""])
        elements.append(_table(rows, widths=[42 * mm, 38 * mm, 55 * mm, 35 * mm]))
        if invoice.notes:
            elements.append(_p("Observaciones", styles["Section"]))
            elements.append(_p(invoice.notes, styles["Cell"]))

    return _build_pdf(profile.invoice_header_title, body)

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
BORDER = colors.HexColor("#D9D9E3")
LIGHT_BG = colors.HexColor("#F7F8FA")


def _styles():
    base = getSampleStyleSheet()
    base.add(ParagraphStyle(name="DocTitle", parent=base["Title"], fontName="Helvetica-Bold", fontSize=18, textColor=TEXT, alignment=2, spaceAfter=4))
    base.add(ParagraphStyle(name="DocMeta", parent=base["BodyText"], fontSize=8.2, textColor=MUTED, alignment=2, leading=10))
    base.add(ParagraphStyle(name="Letter", parent=base["Title"], fontName="Helvetica-Bold", fontSize=22, textColor=TEXT, alignment=1, leading=22))
    base.add(ParagraphStyle(name="Section", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=10.5, textColor=TEXT, spaceBefore=10, spaceAfter=5))
    base.add(ParagraphStyle(name="SmallMuted", parent=base["BodyText"], fontSize=8, textColor=MUTED, leading=10))
    base.add(ParagraphStyle(name="Cell", parent=base["BodyText"], fontSize=8.4, textColor=TEXT, leading=10))
    base.add(ParagraphStyle(name="CellRight", parent=base["BodyText"], fontSize=8.4, textColor=TEXT, leading=10, alignment=2))
    base.add(ParagraphStyle(name="CellBold", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=8.4, textColor=TEXT, leading=10))
    base.add(ParagraphStyle(name="CellBoldRight", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=8.4, textColor=TEXT, leading=10, alignment=2))
    return base


def _p(value, style):
    text = "" if value is None else str(value)
    return Paragraph(escape(text).replace("\n", "<br/>"), style)


def _money(value):
    amount = Decimal(str(value or 0))
    return f"$ {amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _quantity(value):
    amount = Decimal(str(value or 0))
    text = f"{amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return text[:-3] if text.endswith(",00") else text


def _minutes(value):
    total = int(value or 0)
    hours, minutes = divmod(total, 60)
    if hours and minutes:
        return f"{hours} h {minutes} min"
    if hours:
        return f"{hours} h"
    return f"{minutes} min"


def _date(value):
    if not value:
        return "-"
    if hasattr(value, "date"):
        value = timezone.localtime(value).date() if getattr(value, "tzinfo", None) else value.date()
    return value.strftime("%d/%m/%Y")


def _datetime(value):
    if not value:
        return "-"
    if getattr(value, "tzinfo", None):
        value = timezone.localtime(value)
    return value.strftime("%d/%m/%Y %H:%M")


def _filename(value):
    return "".join(char if char.isalnum() or char in {"-", "_"} else "_" for char in str(value))


def _display(instance, field):
    method = getattr(instance, f"get_{field}_display", None)
    if callable(method):
        return method()
    return getattr(instance, field, "")


def _safe_logo(profile):
    if not profile.logo:
        return None
    try:
        logo_path = Path(profile.logo.path)
    except Exception:
        return None
    if not logo_path.exists():
        return None
    return Image(str(logo_path), width=34 * mm, height=22 * mm, kind="proportional")


def _workshop_block(profile, styles):
    block = []
    logo = _safe_logo(profile)
    if logo:
        block.append(logo)
        block.append(Spacer(1, 3))
    block.extend(
        [
            _p(profile.name, styles["CellBold"]),
            _p(profile.address, styles["SmallMuted"]),
            _p(f"Tel: {profile.phone}" if profile.phone else "", styles["SmallMuted"]),
            _p(f"WhatsApp: {profile.whatsapp}" if profile.whatsapp else "", styles["SmallMuted"]),
            _p(profile.email, styles["SmallMuted"]),
        ]
    )
    return block


def _document_header(elements, title, *, number="", date_value=None, letter="", subtitle="", status=""):
    profile = get_workshop_profile()
    styles = _styles()
    date_text = _datetime(date_value or timezone.now())

    document_lines = [_p(title.upper(), styles["DocTitle"])]
    if subtitle:
        document_lines.append(_p(subtitle, styles["DocMeta"]))
    if number:
        document_lines.append(_p(f"Nro: {number}", styles["DocMeta"]))
    document_lines.append(_p(f"Fecha: {date_text}", styles["DocMeta"]))
    if status:
        document_lines.append(_p(f"Estado: {status}", styles["DocMeta"]))

    right_block = document_lines
    if letter:
        letter_box = Table([[_p(letter, styles["Letter"])]], colWidths=[16 * mm], rowHeights=[14 * mm])
        letter_box.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 1.2, TEXT),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ]
            )
        )
        right_block = [Table([[letter_box, document_lines]], colWidths=[18 * mm, 52 * mm])]

    header = Table(
        [[_workshop_block(profile, styles), right_block]],
        colWidths=[98 * mm, 72 * mm],
        hAlign="LEFT",
    )
    header.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LINEBELOW", (0, 0), (-1, -1), 0.8, BORDER),
            ]
        )
    )
    elements.append(header)
    elements.append(Spacer(1, 8))


def _table(data, widths=None, header=True, numeric_cols=()):
    table = Table(data, colWidths=widths, hAlign="LEFT", repeatRows=1 if header else 0)
    style = [
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        style.extend(
            [
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT_BG),
                ("TEXTCOLOR", (0, 0), (-1, 0), TEXT),
                ("LINEBELOW", (0, 0), (-1, 0), 0.7, BORDER),
            ]
        )
    for col in numeric_cols:
        style.append(("ALIGN", (col, 1 if header else 0), (col, -1), "RIGHT"))
    table.setStyle(TableStyle(style))
    return table


def _info_box(title, rows, styles):
    elements = [_p(title, styles["Section"])]
    data = []
    for left_label, left_value, right_label, right_value in rows:
        data.append(
            [
                _p(left_label, styles["CellBold"]),
                _p(left_value, styles["Cell"]),
                _p(right_label, styles["CellBold"]),
                _p(right_value, styles["Cell"]),
            ]
        )
    elements.append(_table(data, widths=[28 * mm, 58 * mm, 34 * mm, 50 * mm], header=False))
    return elements


def _client_vehicle_rows(work_order):
    vehicle = work_order.vehicle
    client = work_order.client
    return [
        ("Cliente", client.full_name, "Documento", getattr(client, "document", "") or "-"),
        ("Telefono", getattr(client, "phone", "") or "-", "Email", getattr(client, "email", "") or "-"),
        ("Vehiculo", f"{vehicle.brand} {vehicle.model}", "Patente", vehicle.plate),
        ("VIN/Chasis", getattr(vehicle, "vin", "") or "-", "Color", getattr(vehicle, "color", "") or "-"),
    ]


def _work_order_rows(work_order):
    return [
        ("Orden", work_order.order_number, "Estado", _display(work_order, "status")),
        ("Ingreso", _datetime(work_order.entry_date), "Entrega estimada", _date(work_order.estimated_delivery_date)),
        ("Prioridad", _display(work_order, "priority"), "Avance", f"{work_order.progress_percent}%"),
    ]


def _line_items(work_order, styles):
    rows = [
        [_p("Concepto", styles["CellBold"]), _p("Detalle", styles["CellBold"]), _p("Cant./Tiempo", styles["CellBoldRight"]), _p("Unitario", styles["CellBoldRight"]), _p("Total", styles["CellBoldRight"])]
    ]
    for task in work_order.tasks.exclude(status="cancelled").select_related("operator", "task_template").order_by("execution_order", "created_at"):
        detail = task.title
        if task.operator:
            detail = f"{detail}\nOperario: {task.operator.full_name}"
        rows.append(
            [
                _p("Mano de obra", styles["Cell"]),
                _p(detail, styles["Cell"]),
                _p(_minutes(task.estimated_minutes), styles["CellRight"]),
                _p("-", styles["CellRight"]),
                _p(_money(task.labor_cost), styles["CellRight"]),
            ]
        )
    for item in work_order.parts.exclude(status="returned").select_related("part").order_by("created_at"):
        rows.append(
            [
                _p("Repuesto", styles["Cell"]),
                _p(f"{item.part.code} - {item.part.name}", styles["Cell"]),
                _p(_quantity(item.quantity), styles["CellRight"]),
                _p(_money(item.unit_cost), styles["CellRight"]),
                _p(_money(item.total_cost), styles["CellRight"]),
            ]
        )
    for item in work_order.materials.exclude(status="returned").select_related("material").order_by("created_at"):
        rows.append(
            [
                _p("Material", styles["Cell"]),
                _p(f"{item.material.code} - {item.material.name}", styles["Cell"]),
                _p(_quantity(item.quantity), styles["CellRight"]),
                _p(_money(item.unit_cost), styles["CellRight"]),
                _p(_money(item.total_cost), styles["CellRight"]),
            ]
        )
    if len(rows) == 1:
        rows.append([_p("Sin items registrados", styles["Cell"]), "", "", "", ""])
    return _table(rows, widths=[30 * mm, 76 * mm, 28 * mm, 31 * mm, 31 * mm], numeric_cols=(2, 3, 4))


def _totals_table(rows, styles):
    data = [[_p(label, styles["CellBold"] if bold else styles["Cell"]), _p(_money(value), styles["CellBoldRight"] if bold else styles["CellRight"])] for label, value, bold in rows]
    table = _table(data, widths=[56 * mm, 36 * mm], header=False, numeric_cols=(1,))
    wrapper = Table([["", table]], colWidths=[78 * mm, 92 * mm], hAlign="LEFT")
    wrapper.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    return wrapper


def _footer(elements):
    profile = get_workshop_profile()
    styles = _styles()
    elements.append(Spacer(1, 10))
    if profile.document_footer:
        elements.append(_p(profile.document_footer, styles["SmallMuted"]))
    elements.append(_p("Documento generado por AutoFlow.", styles["SmallMuted"]))


def _build_pdf(title, body_builder, *, number="", date_value=None, letter="", subtitle="", status=""):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
    )
    elements = []
    _document_header(elements, title, number=number, date_value=date_value, letter=letter, subtitle=subtitle, status=status)
    body_builder(elements, _styles())
    _footer(elements)
    doc.build(elements)
    return buffer.getvalue()


def pdf_response(content: bytes, filename: str):
    response = HttpResponse(content, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{_filename(filename)}.pdf"'
    return response


def generate_work_order_pdf(work_order):
    profile = get_workshop_profile()

    def body(elements, styles):
        elements.extend(_info_box("Datos del cliente y vehiculo", _client_vehicle_rows(work_order), styles))
        elements.extend(_info_box("Datos de la orden", _work_order_rows(work_order), styles))
        elements.append(_p("Descripcion del trabajo", styles["Section"]))
        elements.append(_p(work_order.description or "-", styles["Cell"]))
        if work_order.notes:
            elements.append(_p("Observaciones", styles["Section"]))
            elements.append(_p(work_order.notes, styles["Cell"]))

        elements.append(_p("Detalle de tareas, repuestos y materiales", styles["Section"]))
        elements.append(_line_items(work_order, styles))
        elements.append(_p("Resumen", styles["Section"]))
        elements.append(
            _totals_table(
                [
                    ("Mano de obra", work_order.labor_amount, False),
                    ("Materiales", work_order.materials_amount, False),
                    ("Repuestos", work_order.parts_amount, False),
                    ("Subtotal", work_order.subtotal_amount, True),
                ],
                styles,
            )
        )
        elements.append(Spacer(1, 18))
        elements.append(_table([[_p("Firma cliente", styles["SmallMuted"]), _p("Firma taller", styles["SmallMuted"])]], widths=[82 * mm, 82 * mm], header=False))

    return _build_pdf(
        profile.order_header_title or "Orden de trabajo",
        body,
        number=work_order.order_number,
        date_value=work_order.entry_date,
        status=_display(work_order, "status"),
    )


def generate_estimate_pdf(estimate):
    profile = get_workshop_profile()
    work_order = estimate.work_order

    def body(elements, styles):
        elements.extend(_info_box("Datos del cliente y vehiculo", _client_vehicle_rows(work_order), styles))
        elements.extend(
            _info_box(
                "Datos del presupuesto",
                [
                    ("Orden", work_order.order_number, "Estado", _display(estimate, "status")),
                    ("Fecha", _datetime(estimate.created_at), "Aprobado", _datetime(estimate.approved_at)),
                    ("Entrega estimada", _date(work_order.estimated_delivery_date), "Patente", work_order.vehicle.plate),
                ],
                styles,
            )
        )
        elements.append(_p("Detalle presupuestado", styles["Section"]))
        elements.append(_line_items(work_order, styles))
        if estimate.extra_amount:
            elements.append(
                _table(
                    [
                        [_p("Item adicional", styles["CellBold"]), _p("Importe", styles["CellBoldRight"])],
                        [_p(estimate.extra_description or "Adicional", styles["Cell"]), _p(_money(estimate.extra_amount), styles["CellRight"])],
                    ],
                    widths=[134 * mm, 36 * mm],
                    numeric_cols=(1,),
                )
            )
        elements.append(_p("Resumen", styles["Section"]))
        elements.append(
            _totals_table(
                [
                    ("Mano de obra", estimate.labor_amount, False),
                    ("Materiales", estimate.materials_amount, False),
                    ("Repuestos", estimate.parts_amount, False),
                    (estimate.extra_description or "Item adicional", estimate.extra_amount, False),
                    ("Total presupuesto", estimate.total_amount, True),
                ],
                styles,
            )
        )
        elements.append(_p("Valores sujetos a disponibilidad de repuestos/materiales y vigencia comercial del taller.", styles["SmallMuted"]))

    return _build_pdf(
        profile.estimate_header_title or "Presupuesto",
        body,
        number=work_order.order_number,
        date_value=estimate.created_at,
        subtitle="Comprobante de presupuesto",
        status=_display(estimate, "status"),
    )


def generate_invoice_pdf(invoice):
    profile = get_workshop_profile()
    work_order = invoice.work_order
    balance = Decimal(invoice.total) - Decimal(invoice.paid_amount)

    def body(elements, styles):
        elements.extend(_info_box("Datos del cliente y vehiculo", _client_vehicle_rows(work_order), styles))
        elements.extend(
            _info_box(
                "Datos de facturacion",
                [
                    ("Factura", invoice.invoice_number, "Estado pago", _display(invoice, "payment_status")),
                    ("Orden", work_order.order_number, "Emision", _datetime(invoice.issued_at)),
                    ("Presupuesto", estimate_number(invoice), "Patente", work_order.vehicle.plate),
                ],
                styles,
            )
        )
        elements.append(_p("Detalle facturado", styles["Section"]))
        elements.append(_line_items(work_order, styles))
        if invoice.extra_amount:
            elements.append(
                _table(
                    [
                        [_p("Item adicional", styles["CellBold"]), _p("Importe", styles["CellBoldRight"])],
                        [_p(invoice.extra_description or "Adicional", styles["Cell"]), _p(_money(invoice.extra_amount), styles["CellRight"])],
                    ],
                    widths=[134 * mm, 36 * mm],
                    numeric_cols=(1,),
                )
            )

        elements.append(_p("Liquidacion", styles["Section"]))
        elements.append(
            _totals_table(
                [
                    ("Subtotal", invoice.subtotal, False),
                    (f"Descuento {invoice.discount_percent}%", invoice.discount_amount, False),
                    ("Base imponible", invoice.taxable_amount, False),
                    (f"IVA {invoice.tax_percent}%", invoice.tax_amount, False),
                    ("Total", invoice.total, True),
                    ("Cobrado", invoice.paid_amount, False),
                    ("Saldo", max(balance, Decimal("0.00")), True),
                ],
                styles,
            )
        )

        payments = list(invoice.payments.all())
        elements.append(_p("Pagos registrados", styles["Section"]))
        rows = [[_p("Fecha", styles["CellBold"]), _p("Metodo", styles["CellBold"]), _p("Referencia", styles["CellBold"]), _p("Monto", styles["CellBoldRight"])]]
        for payment in payments:
            rows.append(
                [
                    _p(_datetime(payment.paid_at), styles["Cell"]),
                    _p(_display(payment, "method"), styles["Cell"]),
                    _p(payment.reference or "-", styles["Cell"]),
                    _p(_money(payment.amount), styles["CellRight"]),
                ]
            )
        if len(rows) == 1:
            rows.append([_p("Sin pagos registrados", styles["Cell"]), "", "", ""])
        elements.append(_table(rows, widths=[42 * mm, 38 * mm, 55 * mm, 35 * mm], numeric_cols=(3,)))
        if invoice.notes:
            elements.append(_p("Observaciones", styles["Section"]))
            elements.append(_p(invoice.notes, styles["Cell"]))

    return _build_pdf(
        profile.invoice_header_title or "Factura",
        body,
        number=invoice.invoice_number,
        date_value=invoice.issued_at,
        letter="B",
        subtitle="Comprobante de gestion no fiscal - sin CAE",
        status=_display(invoice, "payment_status"),
    )


def estimate_number(invoice):
    if not invoice.estimate_id:
        return "-"
    return invoice.estimate.work_order.order_number

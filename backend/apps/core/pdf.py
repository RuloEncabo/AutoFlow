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
COMMERCIAL_BLUE = colors.HexColor("#0B84F3")
COMMERCIAL_TITLE = colors.HexColor("#B8B8B8")
COMMERCIAL_DARK = colors.HexColor("#202124")
COMMERCIAL_GRAY = colors.HexColor("#7A7A7A")
COMMERCIAL_ROW = colors.HexColor("#F4F6FA")
COMMERCIAL_RED = colors.HexColor("#FF2D2D")


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
    base.add(ParagraphStyle(name="CommercialTitle", parent=base["Title"], fontName="Helvetica", fontSize=34, textColor=COMMERCIAL_TITLE, alignment=1, leading=37, spaceAfter=8))
    base.add(ParagraphStyle(name="CommercialLabel", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=9, textColor=COMMERCIAL_DARK, leading=12))
    base.add(ParagraphStyle(name="CommercialText", parent=base["BodyText"], fontName="Helvetica", fontSize=8.5, textColor=COMMERCIAL_GRAY, leading=11))
    base.add(ParagraphStyle(name="CommercialName", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=12, textColor=COMMERCIAL_DARK, leading=14))
    base.add(ParagraphStyle(name="SummaryLabel", parent=base["BodyText"], fontName="Helvetica", fontSize=8.2, textColor=COMMERCIAL_GRAY, leading=10))
    base.add(ParagraphStyle(name="SummaryValue", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=10.5, textColor=COMMERCIAL_BLUE, leading=13))
    base.add(ParagraphStyle(name="ItemTitle", parent=base["BodyText"], fontName="Helvetica", fontSize=10.2, textColor=COMMERCIAL_DARK, leading=13))
    base.add(ParagraphStyle(name="ItemDetail", parent=base["BodyText"], fontName="Helvetica", fontSize=8.3, textColor=COMMERCIAL_GRAY, leading=10))
    base.add(ParagraphStyle(name="CommercialFooterBlue", parent=base["BodyText"], fontName="Helvetica", fontSize=10.5, textColor=COMMERCIAL_BLUE, leading=13))
    base.add(ParagraphStyle(name="TotalLabel", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=8.5, textColor=COMMERCIAL_DARK, leading=11))
    base.add(ParagraphStyle(name="TotalValue", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=8.5, textColor=COMMERCIAL_DARK, leading=11, alignment=2))
    base.add(ParagraphStyle(name="TotalRedLabel", parent=base["BodyText"], fontName="Helvetica", fontSize=8.5, textColor=COMMERCIAL_RED, leading=11))
    base.add(ParagraphStyle(name="TotalRedValue", parent=base["BodyText"], fontName="Helvetica", fontSize=8.5, textColor=COMMERCIAL_RED, leading=11, alignment=2))
    base.add(ParagraphStyle(name="GrandLabel", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=10, textColor=colors.white, leading=13))
    base.add(ParagraphStyle(name="GrandValue", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=10, textColor=colors.white, leading=13, alignment=2))
    base.add(ParagraphStyle(name="Signature", parent=base["BodyText"], fontName="Helvetica-Oblique", fontSize=20, textColor=COMMERCIAL_DARK, leading=24, alignment=1))
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


def _logo_path(profile):
    if not profile.logo:
        return None
    try:
        path = Path(profile.logo.path)
    except Exception:
        return None
    return path if path.exists() else None


def _draw_logo_or_name(canvas, profile, x, y, width, height, *, color=colors.white):
    logo_path = _logo_path(profile)
    if logo_path:
        canvas.drawImage(str(logo_path), x, y, width=width, height=height, preserveAspectRatio=True, anchor="c", mask="auto")
        return
    canvas.setFillColor(color)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawCentredString(x + width / 2, y + height / 2, profile.name[:22])


def _draw_contact_icon(canvas, icon, x, y):
    canvas.setStrokeColor(colors.white)
    canvas.setFillColor(colors.white)
    canvas.setLineWidth(0.8)
    if icon == "mail":
        canvas.rect(x + 1.4 * mm, y + 1.8 * mm, 3.2 * mm, 2.6 * mm, stroke=1, fill=0)
        canvas.line(x + 1.4 * mm, y + 4.4 * mm, x + 3 * mm, y + 3 * mm)
        canvas.line(x + 4.6 * mm, y + 4.4 * mm, x + 3 * mm, y + 3 * mm)
    elif icon == "phone":
        path = canvas.beginPath()
        path.moveTo(x + 1.8 * mm, y + 4.6 * mm)
        path.curveTo(x + 2.2 * mm, y + 2.2 * mm, x + 3.8 * mm, y + 1.4 * mm, x + 4.6 * mm, y + 2.2 * mm)
        canvas.drawPath(path, stroke=1, fill=0)
        canvas.circle(x + 2.0 * mm, y + 4.5 * mm, 0.45 * mm, stroke=0, fill=1)
        canvas.circle(x + 4.5 * mm, y + 2.1 * mm, 0.45 * mm, stroke=0, fill=1)
    else:
        pin = canvas.beginPath()
        pin.moveTo(x + 3 * mm, y + 1.2 * mm)
        pin.curveTo(x + 1.4 * mm, y + 3.3 * mm, x + 1.8 * mm, y + 5.0 * mm, x + 3 * mm, y + 5.0 * mm)
        pin.curveTo(x + 4.2 * mm, y + 5.0 * mm, x + 4.6 * mm, y + 3.3 * mm, x + 3 * mm, y + 1.2 * mm)
        canvas.drawPath(pin, stroke=1, fill=0)
        canvas.circle(x + 3 * mm, y + 3.8 * mm, 0.55 * mm, stroke=1, fill=0)


def _draw_contact(canvas, x, y, icon, line_one, line_two=""):
    canvas.setFillColor(COMMERCIAL_BLUE)
    canvas.roundRect(x, y + 9 * mm, 6 * mm, 6 * mm, 2 * mm, fill=1, stroke=0)
    _draw_contact_icon(canvas, icon, x, y + 9 * mm)
    canvas.setFillColor(COMMERCIAL_GRAY)
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(x + 20 * mm, y + 10 * mm, line_one or "-")
    canvas.drawCentredString(x + 20 * mm, y + 4.5 * mm, line_two or "")


def _draw_commercial_page(canvas, doc):
    profile = get_workshop_profile()
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(COMMERCIAL_BLUE)
    canvas.rect(0, height - 10 * mm, width, 10 * mm, fill=1, stroke=0)
    shape = canvas.beginPath()
    shape.moveTo(0, height)
    shape.lineTo(82 * mm, height)
    shape.lineTo(65 * mm, height - 34 * mm)
    shape.lineTo(0, height - 34 * mm)
    shape.close()
    canvas.drawPath(shape, fill=1, stroke=0)
    _draw_logo_or_name(canvas, profile, 10 * mm, height - 30 * mm, 42 * mm, 20 * mm)

    email = profile.email_from_address or profile.email or ""
    phone = profile.phone or profile.whatsapp or ""
    schedule = "Lunes a viernes"
    address = profile.address or ""
    _draw_contact(canvas, 82 * mm, height - 30 * mm, "mail", email, profile.email or "")
    _draw_contact(canvas, 118 * mm, height - 30 * mm, "phone", phone, schedule)
    _draw_contact(canvas, 160 * mm, height - 30 * mm, "pin", address[:28], address[28:58])

    footer_y = 55 * mm
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.7)
    canvas.line(0, footer_y, width, footer_y)
    canvas.setFillColor(COMMERCIAL_BLUE)
    canvas.setFont("Helvetica", 11)
    canvas.drawString(16 * mm, 43 * mm, "Gracias por su preferencia.")
    canvas.setFillColor(COMMERCIAL_DARK)
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.drawString(16 * mm, 33 * mm, "Terminos y condiciones")
    canvas.setFillColor(COMMERCIAL_GRAY)
    canvas.setFont("Helvetica", 7)
    footer_text = profile.document_footer or "Documento generado por AutoFlow."
    canvas.drawString(16 * mm, 28 * mm, footer_text[:115])
    _draw_logo_or_name(canvas, profile, width - 42 * mm, 30 * mm, 28 * mm, 16 * mm, color=COMMERCIAL_DARK)
    canvas.restoreState()


def _build_commercial_pdf(title, body_builder):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=38 * mm,
        bottomMargin=62 * mm,
    )
    elements = []
    body_builder(elements, _styles())
    doc.build(elements, onFirstPage=_draw_commercial_page, onLaterPages=_draw_commercial_page)
    return buffer.getvalue()


def _commercial_summary_card(items, styles):
    cells = []
    for label, value in items:
        cells.append([_p(label, styles["SummaryLabel"]), _p(value, styles["SummaryValue"])])
    table = Table([cells], colWidths=[41 * mm] * len(cells), hAlign="RIGHT")
    table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.7, BORDER),
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def _commercial_intro(
    title,
    work_order,
    *,
    number,
    date_value,
    total,
    status,
    styles,
    recipient_label="Emitido a:",
    number_label="Nro:",
    date_label="Fecha:",
    total_label="Total:",
):
    client = work_order.client
    vehicle = work_order.vehicle
    client_lines = [
        _p(recipient_label, styles["CommercialLabel"]),
        _p(client.full_name, styles["CommercialName"]),
        _p(getattr(client, "address", "") or "-", styles["CommercialText"]),
        _p(getattr(client, "city", "") or "", styles["CommercialText"]),
        _p(getattr(client, "email", "") or "", styles["CommercialText"]),
        _p(getattr(client, "phone", "") or "", styles["CommercialText"]),
        Spacer(1, 2),
        _p(f"Vehiculo: {vehicle.brand} {vehicle.model}", styles["CommercialText"]),
        _p(f"Patente: {vehicle.plate}", styles["CommercialText"]),
    ]
    summary = [
        _p(title.upper(), styles["CommercialTitle"]),
        _commercial_summary_card(
            [
                (number_label, number),
                (date_label, _date(date_value)),
                (total_label, _money(total)),
            ],
            styles,
        ),
        _p(f"Estado: {status}", styles["SmallMuted"]) if status else Spacer(1, 1),
    ]
    intro = Table([[client_lines, summary]], colWidths=[58 * mm, 122 * mm], hAlign="LEFT")
    intro.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    return intro


def _commercial_item_cell(title, detail, styles):
    return [_p(title, styles["ItemTitle"]), _p(detail or "", styles["ItemDetail"])]


def _commercial_items_rows(work_order, styles):
    rows = []
    for task in work_order.tasks.exclude(status="cancelled").select_related("operator", "task_template").order_by("execution_order", "created_at"):
        detail = task.description or task.task_template.description if task.task_template else task.description
        if task.operator:
            detail = f"{detail or ''}\nOperario: {task.operator.full_name}".strip()
        rows.append([_commercial_item_cell(task.title, detail, styles), _money(task.labor_cost), "1", _money(task.labor_cost)])
    for item in work_order.parts.exclude(status="returned").select_related("part").order_by("created_at"):
        rows.append([_commercial_item_cell(item.part.name, f"Repuesto {item.part.code}", styles), _money(item.unit_cost), _quantity(item.quantity), _money(item.total_cost)])
    for item in work_order.materials.exclude(status="returned").select_related("material").order_by("created_at"):
        rows.append([_commercial_item_cell(item.material.name, f"Material {item.material.code}", styles), _money(item.unit_cost), _quantity(item.quantity), _money(item.total_cost)])
    return rows


def _commercial_items_table(rows, styles):
    data = [[_p("Item", styles["CommercialLabel"]), _p("Precio", styles["CommercialLabel"]), _p("Cant.", styles["CommercialLabel"]), _p("Total", styles["CommercialLabel"])]]
    for row in rows:
        data.append([row[0], _p(row[1], styles["CellRight"]), _p(row[2], styles["CellRight"]), _p(row[3], styles["CellRight"])])
    if len(data) == 1:
        data.append([_commercial_item_cell("Sin items registrados", "", styles), "", "", ""])
    table = Table(data, colWidths=[104 * mm, 27 * mm, 23 * mm, 36 * mm], hAlign="LEFT", repeatRows=1)
    style = [
        ("BOX", (0, 0), (-1, -1), 0.7, BORDER),
        ("LINEBELOW", (0, 0), (-1, 0), 0.7, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
    ]
    for row_index in range(1, len(data)):
        if row_index % 2:
            style.append(("BACKGROUND", (0, row_index), (-1, row_index), COMMERCIAL_ROW))
    table.setStyle(TableStyle(style))
    return table


def _commercial_payment_block(title, lines, styles):
    data = [[_p(title, styles["CommercialLabel"])]]
    for label, value in lines:
        data.append([_p(label, styles["CommercialLabel"])])
        data.append([_p(value, styles["CommercialText"])])
    table = Table(data, colWidths=[82 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
    return table


def _commercial_totals_table(rows, grand_label, grand_value, styles):
    data = []
    for label, value, color in rows:
        label_style = styles["TotalRedLabel"] if color == "red" else styles["TotalLabel"]
        value_style = styles["TotalRedValue"] if color == "red" else styles["TotalValue"]
        data.append([_p(label, label_style), _p(_money(value), value_style)])
    data.append([_p(grand_label, styles["GrandLabel"]), _p(_money(grand_value), styles["GrandValue"])])
    table = Table(data, colWidths=[44 * mm, 38 * mm], hAlign="RIGHT")
    table_style = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, -1), (-1, -1), COMMERCIAL_BLUE),
        ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
        ("LINEBEFORE", (1, -1), (1, -1), 0.6, colors.white),
    ]
    table.setStyle(TableStyle(table_style))
    return table


def _commercial_bottom(payment, totals):
    table = Table([[payment, totals]], colWidths=[95 * mm, 85 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 10)]))
    return table


def pdf_response(content: bytes, filename: str):
    response = HttpResponse(content, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{_filename(filename)}.pdf"'
    return response


def generate_work_order_pdf(work_order):
    profile = get_workshop_profile()

    def body(elements, styles):
        elements.append(
            _commercial_intro(
                profile.order_header_title or "Orden de trabajo",
                work_order,
                number=work_order.order_number,
                date_value=work_order.entry_date,
                total=work_order.subtotal_amount,
                status=_display(work_order, "status"),
                styles=styles,
                recipient_label="Orden a:",
                number_label="Orden No:",
                date_label="Ingreso:",
                total_label="Subtotal:",
            )
        )
        elements.append(_commercial_items_table(_commercial_items_rows(work_order, styles), styles))
        payment = _commercial_payment_block(
            "Datos de la orden:",
            [
                ("Estado:", _display(work_order, "status")),
                ("Prioridad:", _display(work_order, "priority")),
                ("Entrega estimada:", _date(work_order.estimated_delivery_date)),
                ("Avance:", f"{work_order.tasks_completed}/{work_order.tasks_total} tareas - {work_order.progress_percent}%"),
                ("Descripcion:", work_order.description or "-"),
                ("Observaciones:", work_order.notes or "-"),
            ],
            styles,
        )
        totals = _commercial_totals_table(
            [
                ("Mano de obra", work_order.labor_amount, "dark"),
                ("Materiales", work_order.materials_amount, "dark"),
                ("Repuestos", work_order.parts_amount, "dark"),
            ],
            "Subtotal",
            work_order.subtotal_amount,
            styles,
        )
        elements.append(_commercial_bottom(payment, totals))
        elements.append(Spacer(1, 16))
        signature = Table(
            [
                ["", _p("Firma", styles["Signature"])],
                ["", _p("Conformidad del cliente", styles["CommercialText"])],
            ],
            colWidths=[110 * mm, 70 * mm],
            hAlign="LEFT",
        )
        signature.setStyle(TableStyle([("ALIGN", (1, 0), (1, -1), "CENTER"), ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
        elements.append(signature)

    return _build_commercial_pdf(profile.order_header_title or "Orden de trabajo", body)


def generate_estimate_pdf(estimate):
    profile = get_workshop_profile()
    work_order = estimate.work_order

    def body(elements, styles):
        elements.append(
            _commercial_intro(
                profile.estimate_header_title or "Presupuesto",
                work_order,
                number=work_order.order_number,
                date_value=estimate.created_at,
                total=estimate.total_amount,
                status=_display(estimate, "status"),
                styles=styles,
                recipient_label="Presupuesto a:",
                number_label="Presupuesto No:",
                date_label="Fecha:",
                total_label="Total:",
            )
        )
        rows = _commercial_items_rows(work_order, styles)
        if estimate.extra_amount:
            rows.append(
                [
                    _commercial_item_cell(estimate.extra_description or "Adicional", "Item adicional del presupuesto", styles),
                    _money(estimate.extra_amount),
                    "1",
                    _money(estimate.extra_amount),
                ]
            )
        elements.append(
            _commercial_items_table(rows, styles)
        )
        contact_line = profile.email or profile.email_from_address or profile.phone or profile.whatsapp or "-"
        payment = _commercial_payment_block(
            "Medios y condiciones:",
            [
                ("Contacto:", contact_line),
                ("Orden de trabajo:", work_order.order_number),
                ("Validez:", "Valores sujetos a disponibilidad de repuestos y materiales."),
                ("Entrega estimada:", _date(work_order.estimated_delivery_date)),
            ],
            styles,
        )
        totals = _commercial_totals_table(
            [
                ("Sub Total", estimate.labor_amount + estimate.materials_amount + estimate.parts_amount, "dark"),
                ("Adicional", estimate.extra_amount, "dark"),
            ],
            "Gran Total",
            estimate.total_amount,
            styles,
        )
        elements.append(_commercial_bottom(payment, totals))
        elements.append(Spacer(1, 14))
        signature = Table(
            [
                ["", _p("Firma", styles["Signature"])],
                ["", _p("Conformidad del cliente", styles["CommercialText"])],
            ],
            colWidths=[110 * mm, 70 * mm],
            hAlign="LEFT",
        )
        signature.setStyle(TableStyle([("ALIGN", (1, 0), (1, -1), "CENTER"), ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
        elements.append(signature)

    return _build_commercial_pdf(profile.estimate_header_title or "Presupuesto", body)


def generate_invoice_pdf(invoice):
    profile = get_workshop_profile()
    work_order = invoice.work_order
    balance = Decimal(invoice.total) - Decimal(invoice.paid_amount)

    def body(elements, styles):
        elements.append(
            _commercial_intro(
                profile.invoice_header_title or "Factura",
                work_order,
                number=invoice.invoice_number,
                date_value=invoice.issued_at,
                total=invoice.total,
                status=_display(invoice, "payment_status"),
                styles=styles,
                recipient_label="Factura a:",
                number_label="Factura No:",
                date_label="Fecha factura:",
                total_label="Gran Total:",
            )
        )
        rows = _commercial_items_rows(work_order, styles)
        if invoice.extra_amount:
            rows.append(
                [
                    _commercial_item_cell(invoice.extra_description or "Adicional", "Item adicional de la factura", styles),
                    _money(invoice.extra_amount),
                    "1",
                    _money(invoice.extra_amount),
                ]
            )
        elements.append(_commercial_items_table(rows, styles))
        payment = _commercial_payment_block(
            "Datos de pago:",
            [
                ("Estado:", _display(invoice, "payment_status")),
                ("Orden de trabajo:", work_order.order_number),
                ("Presupuesto:", estimate_number(invoice)),
            ],
            styles,
        )
        totals = _commercial_totals_table(
            [
                ("Sub Total", invoice.subtotal, "dark"),
                (f"Descuento {invoice.discount_percent}%", invoice.discount_amount, "red"),
                (f"IVA {invoice.tax_percent}%", invoice.tax_amount, "dark"),
                ("Cobrado", invoice.paid_amount, "dark"),
                ("Saldo", max(balance, Decimal("0.00")), "dark"),
            ],
            "Gran Total",
            invoice.total,
            styles,
        )
        elements.append(_commercial_bottom(payment, totals))
        elements.append(Spacer(1, 16))
        signature = Table(
            [
                [
                    "",
                    _p("Firma", styles["Signature"]),
                ],
                [
                    "",
                    _p("Responsable administrativo", styles["CommercialText"]),
                ],
            ],
            colWidths=[110 * mm, 70 * mm],
            hAlign="LEFT",
        )
        signature.setStyle(TableStyle([("ALIGN", (1, 0), (1, -1), "CENTER"), ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
        elements.append(signature)
        if invoice.notes:
            elements.append(Spacer(1, 6))
            elements.append(_p(invoice.notes, styles["CommercialText"]))

    return _build_commercial_pdf(profile.invoice_header_title or "Factura", body)


def generate_reception_pdf(reception):
    profile = get_workshop_profile()

    def _status_mark(value, expected):
        return "X" if value == expected else ""

    def body(elements, styles):
        client = reception.client
        vehicle = reception.vehicle
        client_lines = [
            _p("Emitido a:", styles["CommercialLabel"]),
            _p(client.full_name, styles["CommercialName"]),
            _p(getattr(client, "address", "") or "-", styles["CommercialText"]),
            _p(getattr(client, "city", "") or "", styles["CommercialText"]),
            _p(getattr(client, "email", "") or "", styles["CommercialText"]),
            _p(getattr(client, "phone", "") or "", styles["CommercialText"]),
            Spacer(1, 2),
            _p(f"Vehiculo: {vehicle.brand} {vehicle.model}", styles["CommercialText"]),
            _p(f"Patente: {vehicle.plate}", styles["CommercialText"]),
        ]
        summary = [
            _p("CHECK RECEPCION", styles["CommercialTitle"]),
            _commercial_summary_card(
                [
                    ("Nro:", reception.reception_number),
                    ("Fecha:", _date(reception.received_at)),
                    ("Estado:", reception.get_status_display()),
                ],
                styles,
            ),
            _p(f"Origen: {reception.get_source_display()}", styles["SmallMuted"]),
        ]
        intro = Table([[client_lines, summary]], colWidths=[58 * mm, 122 * mm], hAlign="LEFT")
        intro.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
        elements.append(intro)

        info = [
            [_p("Conductor", styles["CommercialLabel"]), _p(reception.driver_name or "-", styles["CommercialText"]), _p("Telefono", styles["CommercialLabel"]), _p(reception.driver_phone or "-", styles["CommercialText"])],
            [_p("Kilometraje", styles["CommercialLabel"]), _p(reception.odometer_km or "-", styles["CommercialText"]), _p("Combustible", styles["CommercialLabel"]), _p(f"{reception.fuel_level}%", styles["CommercialText"])],
            [_p("Orden", styles["CommercialLabel"]), _p(reception.work_order.order_number if reception.work_order else "-", styles["CommercialText"]), _p("Documento", styles["CommercialLabel"]), _p(reception.driver_document or "-", styles["CommercialText"])],
        ]
        elements.append(_table(info, widths=[32 * mm, 58 * mm, 32 * mm, 58 * mm], header=False))
        elements.append(Spacer(1, 8))

        checklist = list(reception.checklist_items.all())
        checklist_rows = [[_p("Check de recepcion", styles["CommercialLabel"]), _p("OK", styles["CommercialLabel"]), _p("Problema", styles["CommercialLabel"]), _p("Obs.", styles["CommercialLabel"])]]
        for item in checklist:
            checklist_rows.append([
                _p(item.label, styles["CommercialText"]),
                _p(_status_mark(item.status, "ok"), styles["CellBold"]),
                _p(_status_mark(item.status, "problem"), styles["TotalRedLabel"] if item.status == "problem" else styles["Cell"]),
                _p(item.notes or "", styles["CommercialText"]),
            ])
        if len(checklist_rows) == 1:
            checklist_rows.append([_p("Sin items de recepcion", styles["CommercialText"]), "", "", ""])
        checklist_table = _table(checklist_rows, widths=[75 * mm, 15 * mm, 20 * mm, 70 * mm])

        inspection = list(reception.inspection_items.all())
        inspection_rows = [[_p("Inspeccion multipunto", styles["CommercialLabel"]), _p("Resultado", styles["CommercialLabel"]), _p("Obs.", styles["CommercialLabel"])]]
        for item in inspection:
            inspection_rows.append([
                _p(f"{item.section} - {item.label}", styles["CommercialText"]),
                _p(item.get_result_display(), styles["TotalRedLabel"] if item.result == "immediate_attention" else styles["CommercialText"]),
                _p(item.notes or "", styles["CommercialText"]),
            ])
        if len(inspection_rows) == 1:
            inspection_rows.append([_p("Sin inspeccion multipunto", styles["CommercialText"]), "", ""])
        inspection_table = _table(inspection_rows, widths=[82 * mm, 42 * mm, 56 * mm])

        elements.append(checklist_table)
        elements.append(Spacer(1, 8))
        elements.append(inspection_table)
        elements.append(Spacer(1, 8))

        damage_rows = [[_p("Zona", styles["CommercialLabel"]), _p("Pieza", styles["CommercialLabel"]), _p("Accion", styles["CommercialLabel"]), _p("Descripcion", styles["CommercialLabel"])]]
        for damage in reception.damages.all():
            damage_rows.append([
                _p(damage.get_zone_display(), styles["CommercialText"]),
                _p(damage.part_name or damage.damage_type or "-", styles["CommercialText"]),
                _p(damage.get_action_required_display(), styles["CommercialText"]),
                _p(damage.description or "-", styles["CommercialText"]),
            ])
        if len(damage_rows) == 1:
            damage_rows.append([_p("Sin danos registrados", styles["CommercialText"]), "", "", ""])
        elements.append(_table(damage_rows, widths=[34 * mm, 45 * mm, 35 * mm, 66 * mm]))

        if reception.notes:
            elements.append(Spacer(1, 8))
            elements.append(_p("Observaciones", styles["CommercialLabel"]))
            elements.append(_p(reception.notes, styles["CommercialText"]))

    return _build_commercial_pdf("Check recepcion", body)


def estimate_number(invoice):
    if not invoice.estimate_id:
        return "-"
    return invoice.estimate.work_order.order_number

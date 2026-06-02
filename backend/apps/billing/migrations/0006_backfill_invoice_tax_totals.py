from decimal import Decimal, ROUND_HALF_UP

from django.db import migrations


def money(value):
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def backfill_invoice_tax_totals(apps, schema_editor):
    Invoice = apps.get_model("billing", "Invoice")
    for invoice in Invoice.objects.all().iterator():
        total = money(invoice.total)
        tax_percent = money(invoice.tax_percent or Decimal("21.00"))
        divisor = Decimal("1.00") + (tax_percent / Decimal("100"))
        taxable_amount = money(total / divisor) if divisor else total
        tax_amount = money(total - taxable_amount)
        invoice.extra_description = invoice.extra_description or "Importe factura anterior"
        invoice.extra_amount = invoice.extra_amount or taxable_amount
        invoice.subtotal = invoice.subtotal or taxable_amount
        invoice.taxable_amount = invoice.taxable_amount or taxable_amount
        invoice.tax_amount = invoice.tax_amount or tax_amount
        invoice.save(
            update_fields=[
                "extra_description",
                "extra_amount",
                "subtotal",
                "taxable_amount",
                "tax_amount",
            ]
        )


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0005_estimate_extra_amount_estimate_extra_description_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_invoice_tax_totals, migrations.RunPython.noop),
    ]

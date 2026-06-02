import AddIcon from "@mui/icons-material/Add";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PaidIcon from "@mui/icons-material/Paid";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import {
  Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, MenuItem, Stack, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  approveEstimate, createEstimate, createInvoice, createPayment,
  createMercadoPagoPreference, downloadEstimatePdf, downloadInvoicePdf, listEstimates, listInvoices,
} from "../../api/billingApi.js";
import { getApiErrorMessage } from "../../api/errorUtils.js";
import { listWorkOrders } from "../../api/workOrdersApi.js";
import StatusChip from "../../components/StatusChip.jsx";

const emptyEstimate = { work_order: "", extra_description: "", extra_amount: "0.00", status: "pending" };
const emptyInvoice = { work_order: "", estimate: "", extra_description: "", extra_amount: "0.00", tax_percent: "21.00", discount_percent: "0.00", payment_status: "pending", notes: "" };
const emptyPayment = { invoice: "", amount: "0.00", method: "cash", reference: "", notes: "" };

const moneyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

function estimateLabel(estimate) {
  return `${estimate.work_order_number} - ${moneyFormatter.format(Number(estimate.total_amount || 0))}`;
}

function buildInvoicePayload(form) {
  return {
    work_order: form.work_order,
    estimate: form.estimate || null,
    extra_description: form.extra_description,
    extra_amount: form.extra_amount,
    tax_percent: form.tax_percent,
    discount_percent: form.discount_percent,
    payment_status: form.payment_status,
    notes: form.notes,
  };
}

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("estimates");
  const [formOpen, setFormOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [estimateForm, setEstimateForm] = useState(emptyEstimate);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoice);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [toast, setToast] = useState(null);

  const estimatesQuery = useQuery({ queryKey: ["estimates"], queryFn: () => listEstimates({ page_size: 100 }) });
  const invoicesQuery = useQuery({ queryKey: ["invoices"], queryFn: () => listInvoices({ page_size: 100 }) });
  const ordersQuery = useQuery({ queryKey: ["work-orders", "options"], queryFn: () => listWorkOrders({ page_size: 100 }) });

  const orders = ordersQuery.data?.results || [];
  const estimates = estimatesQuery.data?.results || [];
  const invoices = invoicesQuery.data?.results || [];
  const approvedEstimates = estimates.filter((estimate) => estimate.status === "approved");

  const saveMutation = useMutation({
    mutationFn: () => tab === "estimates" ? createEstimate(estimateForm) : createInvoice(buildInvoicePayload(invoiceForm)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tab === "estimates" ? "estimates" : "invoices"] });
      setFormOpen(false);
      setEstimateForm(emptyEstimate);
      setInvoiceForm(emptyInvoice);
    },
    onError: (error) => setToast({ severity: "error", message: getApiErrorMessage(error) }),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => approveEstimate(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimates"] }); setToast({ severity: "success", message: "Presupuesto aprobado." }); },
  });

  const paymentMutation = useMutation({
    mutationFn: () => createPayment(paymentForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setPaymentOpen(false);
      setPaymentForm(emptyPayment);
      setToast({ severity: "success", message: "Pago registrado." });
    },
    onError: (error) => setToast({ severity: "error", message: getApiErrorMessage(error) }),
  });

  const mercadoPagoMutation = useMutation({
    mutationFn: (id) => createMercadoPagoPreference(id),
    onSuccess: (data) => {
      const checkoutUrl = data.init_point || data.sandbox_init_point;
      if (checkoutUrl) window.open(checkoutUrl, "_blank", "noopener,noreferrer");
      setToast({ severity: "success", message: "Checkout de Mercado Pago generado." });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error) => setToast({ severity: "error", message: getApiErrorMessage(error) }),
  });

  const openCreate = () => {
    if (tab === "estimates") setEstimateForm({ ...emptyEstimate, work_order: orders[0]?.id || "" });
    else {
      const firstEstimate = approvedEstimates[0];
      setInvoiceForm({
        ...emptyInvoice,
        work_order: firstEstimate?.work_order || orders[0]?.id || "",
        estimate: firstEstimate?.id || "",
      });
    }
    setFormOpen(true);
  };

  const downloadPdf = async (downloadFn, id, filename) => {
    try {
      await downloadFn(id, filename);
    } catch (error) {
      setToast({ severity: "error", message: getApiErrorMessage(error) });
    }
  };

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" gap={2} flexWrap="wrap">
        <Box><Typography variant="h4">Facturacion</Typography><Typography color="text.secondary">Presupuestos, facturas y pagos.</Typography></Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Nuevo {tab === "estimates" ? "presupuesto" : "factura"}</Button>
      </Box>
      {toast && <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.message}</Alert>}
      <Card><CardContent>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
          <Tab value="estimates" label="Presupuestos" />
          <Tab value="invoices" label="Facturas" />
        </Tabs>
        {tab === "estimates" ? (
          <TableContainer><Table><TableHead><TableRow><TableCell>Orden</TableCell><TableCell>Mano obra</TableCell><TableCell>Materiales</TableCell><TableCell>Repuestos</TableCell><TableCell>Adicional</TableCell><TableCell>Total</TableCell><TableCell>Estado</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
            <TableBody>{estimates.map((item) => <TableRow key={item.id} hover><TableCell>{item.work_order_number}</TableCell><TableCell>{moneyFormatter.format(Number(item.labor_amount || 0))}</TableCell><TableCell>{moneyFormatter.format(Number(item.materials_amount || 0))}</TableCell><TableCell>{moneyFormatter.format(Number(item.parts_amount || 0))}</TableCell><TableCell>{moneyFormatter.format(Number(item.extra_amount || 0))}</TableCell><TableCell><Typography fontWeight={700}>{moneyFormatter.format(Number(item.total_amount || 0))}</Typography></TableCell><TableCell><StatusChip label={item.status} color={item.status === "approved" ? "success" : "primary"} /></TableCell><TableCell align="right"><Tooltip title="Descargar PDF"><IconButton color="primary" onClick={() => downloadPdf(downloadEstimatePdf, item.id, `presupuesto_${item.work_order_number}.pdf`)}><PictureAsPdfIcon /></IconButton></Tooltip><Tooltip title="Aprobar"><span><IconButton color="success" disabled={item.status === "approved"} onClick={() => approveMutation.mutate(item.id)}><ThumbUpIcon /></IconButton></span></Tooltip></TableCell></TableRow>)}{estimates.length === 0 && <TableRow><TableCell colSpan={8}><Typography color="text.secondary" textAlign="center" py={4}>Sin presupuestos.</Typography></TableCell></TableRow>}</TableBody>
          </Table></TableContainer>
        ) : (
          <TableContainer><Table><TableHead><TableRow><TableCell>Factura</TableCell><TableCell>Orden</TableCell><TableCell>Cliente</TableCell><TableCell>Subtotal</TableCell><TableCell>IVA / desc.</TableCell><TableCell>Total</TableCell><TableCell>Cobrado / deuda</TableCell><TableCell>Estado</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
            <TableBody>{invoices.map((item) => <TableRow key={item.id} hover><TableCell><Typography fontWeight={700}>{item.invoice_number}</Typography>{item.mercadopago_status && <Typography variant="caption" color="text.secondary">MP: {item.mercadopago_status}</Typography>}</TableCell><TableCell>{item.work_order_number}</TableCell><TableCell>{item.client_name}</TableCell><TableCell>{moneyFormatter.format(Number(item.subtotal || 0))}</TableCell><TableCell><Typography variant="body2">IVA {item.tax_percent}%: {moneyFormatter.format(Number(item.tax_amount || 0))}</Typography><Typography variant="body2" color="text.secondary">Desc. {item.discount_percent}%: {moneyFormatter.format(Number(item.discount_amount || 0))}</Typography></TableCell><TableCell>{moneyFormatter.format(Number(item.total || 0))}</TableCell><TableCell><Typography variant="body2">Cobrado: {moneyFormatter.format(Number(item.paid_amount || 0))}</Typography><Typography variant="body2" color={Number(item.balance_due || 0) > 0 ? "error" : "success.main"}>Debe: {moneyFormatter.format(Number(item.balance_due || 0))}</Typography></TableCell><TableCell><StatusChip label={item.payment_status} color={item.payment_status === "paid" ? "success" : item.payment_status === "partial" ? "primary" : "default"} /></TableCell><TableCell align="right"><Tooltip title="Cobrar con Mercado Pago"><span><IconButton color="primary" disabled={item.payment_status === "paid" || mercadoPagoMutation.isPending} onClick={() => mercadoPagoMutation.mutate(item.id)}><AccountBalanceWalletIcon /></IconButton></span></Tooltip><Tooltip title="Descargar PDF"><IconButton color="primary" onClick={() => downloadPdf(downloadInvoicePdf, item.id, `${item.invoice_number}.pdf`)}><PictureAsPdfIcon /></IconButton></Tooltip><Tooltip title="Registrar pago"><IconButton color="success" onClick={() => { setPaymentForm({ ...emptyPayment, invoice: item.id, amount: item.balance_due || item.total }); setPaymentOpen(true); }}><PaidIcon /></IconButton></Tooltip></TableCell></TableRow>)}{invoices.length === 0 && <TableRow><TableCell colSpan={9}><Typography color="text.secondary" textAlign="center" py={4}>Sin facturas.</Typography></TableCell></TableRow>}</TableBody>
          </Table></TableContainer>
        )}
      </CardContent></Card>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth><Box component="form" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }}>
        <DialogTitle>Nuevo {tab === "estimates" ? "presupuesto" : "factura"}</DialogTitle>
        <DialogContent><Stack spacing={2} pt={1}>
          {saveMutation.isError && <Alert severity="error">{getApiErrorMessage(saveMutation.error)}</Alert>}
          {tab === "estimates" ? (
            <>
              <TextField select label="Orden" value={estimateForm.work_order} onChange={(event) => setEstimateForm((c) => ({ ...c, work_order: event.target.value }))} required fullWidth>{orders.map((order) => <MenuItem key={order.id} value={order.id}>{order.order_number} - {order.client_name} - {moneyFormatter.format(Number(order.subtotal_amount || 0))}</MenuItem>)}</TextField>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}><TextField label="Item adicional" value={estimateForm.extra_description} onChange={(e) => setEstimateForm((c) => ({ ...c, extra_description: e.target.value }))} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="Valor adicional" type="number" value={estimateForm.extra_amount} onChange={(e) => setEstimateForm((c) => ({ ...c, extra_amount: e.target.value }))} fullWidth inputProps={{ min: 0, step: "0.01" }} /></Grid>
              </Grid>
              <Alert severity="info">
                La mano de obra, materiales y repuestos se calculan automaticamente desde la orden seleccionada.
              </Alert>
            </>
          ) : (
            <>
              <TextField select label="Presupuesto aprobado" value={invoiceForm.estimate} onChange={(event) => {
                const estimate = approvedEstimates.find((item) => item.id === event.target.value);
                setInvoiceForm((current) => ({ ...current, estimate: event.target.value, work_order: estimate?.work_order || current.work_order }));
              }} fullWidth>
                <MenuItem value="">Sin presupuesto aprobado</MenuItem>
                {approvedEstimates.map((estimate) => <MenuItem key={estimate.id} value={estimate.id}>{estimateLabel(estimate)}</MenuItem>)}
              </TextField>
              <TextField select label="Orden" value={invoiceForm.work_order} onChange={(event) => setInvoiceForm((c) => ({ ...c, work_order: event.target.value, estimate: "" }))} required fullWidth>{orders.map((order) => <MenuItem key={order.id} value={order.id}>{order.order_number} - {order.client_name}</MenuItem>)}</TextField>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><TextField label="Item adicional factura" value={invoiceForm.extra_description} onChange={(e) => setInvoiceForm((c) => ({ ...c, extra_description: e.target.value }))} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField label="Valor adicional" type="number" value={invoiceForm.extra_amount} onChange={(e) => setInvoiceForm((c) => ({ ...c, extra_amount: e.target.value }))} fullWidth inputProps={{ min: 0, step: "0.01" }} /></Grid>
                <Grid item xs={12} md={3}><TextField label="Descuento %" type="number" value={invoiceForm.discount_percent} onChange={(e) => setInvoiceForm((c) => ({ ...c, discount_percent: e.target.value }))} fullWidth inputProps={{ min: 0, max: 100, step: "0.01" }} /></Grid>
                <Grid item xs={12} md={6}><TextField select label="IVA" value={invoiceForm.tax_percent} onChange={(e) => setInvoiceForm((c) => ({ ...c, tax_percent: e.target.value }))} fullWidth><MenuItem value="21.00">21%</MenuItem><MenuItem value="10.50">10,5%</MenuItem></TextField></Grid>
                <Grid item xs={12} md={6}><TextField select label="Estado pago" value={invoiceForm.payment_status} onChange={(e) => setInvoiceForm((c) => ({ ...c, payment_status: e.target.value }))} fullWidth><MenuItem value="pending">Pendiente</MenuItem><MenuItem value="partial">Parcial</MenuItem><MenuItem value="paid">Pagado</MenuItem></TextField></Grid>
              </Grid>
              <TextField label="Observaciones" value={invoiceForm.notes} onChange={(e) => setInvoiceForm((c) => ({ ...c, notes: e.target.value }))} fullWidth multiline minRows={2} />
              <Alert severity="info">
                La factura toma el presupuesto aprobado o, si no se selecciona uno, calcula desde la orden. El descuento se aplica antes del IVA.
              </Alert>
            </>
          )}
        </Stack></DialogContent><DialogActions><Button onClick={() => setFormOpen(false)}>Cancelar</Button><Button type="submit" variant="contained" disabled={saveMutation.isPending}>Guardar</Button></DialogActions>
      </Box></Dialog>

      <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)} maxWidth="sm" fullWidth><Box component="form" onSubmit={(event) => { event.preventDefault(); paymentMutation.mutate(); }}>
        <DialogTitle>Registrar pago</DialogTitle><DialogContent><Stack spacing={2} pt={1}>
          <TextField label="Monto" type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm((c) => ({ ...c, amount: e.target.value }))} fullWidth />
          <TextField select label="Metodo" value={paymentForm.method} onChange={(e) => setPaymentForm((c) => ({ ...c, method: e.target.value }))} fullWidth><MenuItem value="cash">Efectivo</MenuItem><MenuItem value="transfer">Transferencia</MenuItem><MenuItem value="card">Tarjeta</MenuItem><MenuItem value="other">Otro</MenuItem></TextField>
          <TextField label="Referencia" value={paymentForm.reference} onChange={(e) => setPaymentForm((c) => ({ ...c, reference: e.target.value }))} fullWidth />
        </Stack></DialogContent><DialogActions><Button onClick={() => setPaymentOpen(false)}>Cancelar</Button><Button type="submit" variant="contained" disabled={paymentMutation.isPending}>Guardar</Button></DialogActions>
      </Box></Dialog>
    </Stack>
  );
}

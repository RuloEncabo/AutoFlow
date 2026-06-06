import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PaidIcon from "@mui/icons-material/Paid";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import RefreshIcon from "@mui/icons-material/Refresh";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Grid,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router-dom";

import { listInvoices } from "../../api/billingApi.js";
import { getOperationalDashboard } from "../../api/dashboardApi.js";
import { getApiErrorMessage } from "../../api/errorUtils.js";
import StatCard from "../../components/StatCard.jsx";
import StatusChip from "../../components/StatusChip.jsx";

const moneyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function money(value) {
  return moneyFormatter.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  return dateFormatter.format(new Date(value));
}

export default function FinancialDashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "financial"],
    queryFn: getOperationalDashboard,
    refetchInterval: 60_000,
  });
  const invoicesQuery = useQuery({
    queryKey: ["dashboard", "financial", "invoices"],
    queryFn: () => listInvoices({ page_size: 8, ordering: "-issued_at" }),
    refetchInterval: 60_000,
  });

  const billing = dashboardQuery.data?.billing || {};
  const invoices = invoicesQuery.data?.results || [];
  const stats = [
    {
      title: "Facturacion mes",
      value: money(billing.month_total),
      helper: `${billing.paid_month_count ?? 0} facturas cobradas en el mes`,
      icon: <PaidIcon />,
      color: "primary",
    },
    {
      title: "Total adeudado",
      value: money(billing.pending_total),
      helper: `${billing.pending_count ?? 0} facturas pendientes o parciales`,
      icon: <WarningAmberIcon />,
      color: Number(billing.pending_total || 0) > 0 ? "error" : "success",
    },
    {
      title: "Facturas pendientes",
      value: String(billing.pending_count ?? 0),
      helper: "Documentos que requieren seguimiento",
      icon: <ReceiptLongIcon />,
      color: "warning",
    },
    {
      title: "Cobradas este mes",
      value: String(billing.paid_month_count ?? 0),
      helper: "Facturas con estado pagado",
      icon: <AccountBalanceWalletIcon />,
      color: "success",
    },
  ];

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h4">Dashboard financiero</Typography>
          <Typography color="text.secondary">
            Indicadores de facturacion, deuda y cobranza.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              dashboardQuery.refetch();
              invoicesQuery.refetch();
            }}
            disabled={dashboardQuery.isFetching || invoicesQuery.isFetching}
          >
            Actualizar
          </Button>
          <Button component={RouterLink} to="/billing" variant="contained" startIcon={<ReceiptLongIcon />}>
            Ir a facturacion
          </Button>
        </Stack>
      </Box>

      {(dashboardQuery.isError || invoicesQuery.isError) && (
        <Alert severity="warning">
          {getApiErrorMessage(dashboardQuery.error || invoicesQuery.error, "No se pudieron cargar los indicadores financieros.")}
        </Alert>
      )}

      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} lg={3} key={stat.title}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} mb={2}>
                <Box>
                  <Typography variant="h6">Ultimas facturas</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Control rapido de cobrado y adeudado por cliente.
                  </Typography>
                </Box>
                <StatusChip label={invoicesQuery.isFetching ? "Actualizando" : "Datos reales"} color="primary" />
              </Stack>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Factura</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Debe</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} hover>
                        <TableCell>{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.client_name}</TableCell>
                        <TableCell>{formatDate(invoice.issued_at)}</TableCell>
                        <TableCell>{money(invoice.total)}</TableCell>
                        <TableCell>{money(invoice.balance_due)}</TableCell>
                        <TableCell>
                          <StatusChip
                            label={invoice.payment_status}
                            color={invoice.payment_status === "paid" ? "success" : invoice.payment_status === "partial" ? "primary" : "default"}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {!invoicesQuery.isLoading && invoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography color="text.secondary" textAlign="center" py={4}>
                            Sin facturas para mostrar.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Resumen de cobranza</Typography>
                <Box display="flex" justifyContent="space-between" gap={2}>
                  <Typography color="text.secondary">Facturacion mensual</Typography>
                  <Typography fontWeight={700}>{money(billing.month_total)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" gap={2}>
                  <Typography color="text.secondary">Deuda pendiente</Typography>
                  <Typography fontWeight={700} color={Number(billing.pending_total || 0) > 0 ? "error.main" : "success.main"}>
                    {money(billing.pending_total)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" gap={2}>
                  <Typography color="text.secondary">Facturas cobradas</Typography>
                  <Typography fontWeight={700}>{billing.paid_month_count ?? 0}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" gap={2}>
                  <Typography color="text.secondary">Facturas pendientes</Typography>
                  <Typography fontWeight={700}>{billing.pending_count ?? 0}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

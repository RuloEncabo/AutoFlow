import BuildIcon from "@mui/icons-material/Build";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CarRepairIcon from "@mui/icons-material/CarRepair";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import InventoryIcon from "@mui/icons-material/Inventory";
import MonitorIcon from "@mui/icons-material/Monitor";
import RefreshIcon from "@mui/icons-material/Refresh";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { getOperationalDashboard } from "../../api/dashboardApi.js";
import { getApiErrorMessage } from "../../api/errorUtils.js";
import { getHealth } from "../../api/healthApi.js";
import StatCard from "../../components/StatCard.jsx";
import StatusChip from "../../components/StatusChip.jsx";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDate(value) {
  if (!value) return "Sin fecha";
  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

export default function DashboardPage() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
  });
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "operational"],
    queryFn: getOperationalDashboard,
    refetchInterval: 60_000,
  });

  const data = dashboardQuery.data;
  const stats = [
    {
      title: "Ordenes activas",
      value: data?.stats?.active_orders ?? 0,
      helper: `${data?.stats?.delayed_orders ?? 0} ordenes retrasadas`,
      icon: <FactCheckIcon />,
      color: "primary",
    },
    {
      title: "Vehiculos en taller",
      value: data?.stats?.vehicles_in_shop ?? 0,
      helper: "Vehiculos con orden activa no entregada",
      icon: <CarRepairIcon />,
      color: "success",
    },
    {
      title: "Turnos de hoy",
      value: data?.appointments_today?.total ?? 0,
      helper: `${data?.appointments_today?.confirmed ?? 0} confirmados, ${data?.appointments_today?.scheduled ?? 0} programados`,
      icon: <CalendarMonthIcon />,
      color: "warning",
    },
    {
      title: "Insumos criticos",
      value: data?.stock?.critical_total ?? 0,
      helper: `${data?.stock?.critical_parts ?? 0} repuestos, ${data?.stock?.critical_materials ?? 0} materiales`,
      icon: <InventoryIcon />,
      color: "error",
    },
    {
      title: "En reparacion",
      value: data?.stats?.orders_in_repair ?? 0,
      helper: "Ordenes en reparacion o pintura",
      icon: <BuildIcon />,
      color: "warning",
    },
  ];

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h4">Dashboard operativo</Typography>
          <Typography color="text.secondary">
            Indicadores reales de taller, turnos, insumos, repuestos y avance operativo.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => dashboardQuery.refetch()}
            disabled={dashboardQuery.isFetching}
          >
            Actualizar
          </Button>
          <Button
            component={RouterLink}
            to="/tv-dashboard"
            variant="contained"
            startIcon={<MonitorIcon />}
          >
            Abrir TV taller
          </Button>
        </Stack>
      </Box>

      {(dashboardQuery.isError || healthQuery.isError) && (
        <Alert severity="warning">
          {dashboardQuery.isError
            ? getApiErrorMessage(dashboardQuery.error)
            : "No se pudo consultar el estado del backend. Revisa que Django este activo."}
        </Alert>
      )}

      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} lg={4} key={stat.title}>
            <StatCard {...stat} value={String(stat.value)} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} mb={2}>
                <Box>
                  <Typography variant="h6">Proximas prioridades</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ordenes urgentes, retrasadas o actualmente en proceso.
                  </Typography>
                </Box>
                <StatusChip label={dashboardQuery.isFetching ? "Actualizando" : "Datos reales"} color="primary" />
              </Stack>
              <Stack spacing={1.5}>
                {(data?.priorities || []).map((order) => (
                  <Box
                    key={order.id}
                    display="grid"
                    gridTemplateColumns={{ xs: "1fr", md: "1.3fr 1fr 170px" }}
                    alignItems="center"
                    gap={2}
                    py={1.25}
                    borderBottom="1px solid"
                    borderColor="divider"
                  >
                    <Box minWidth={0}>
                      <Typography fontWeight={700}>{order.order_number} - {order.plate}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {order.client_name} | {order.vehicle_label}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <StatusChip label={order.status_label} color="primary" />
                      <StatusChip label={order.priority_label} color={order.delayed ? "error" : "default"} />
                    </Stack>
                    <Box>
                      <Box display="flex" justifyContent="space-between" gap={1}>
                        <Typography variant="body2" color="text.secondary">{formatDate(order.estimated_delivery_date)}</Typography>
                        <Typography variant="body2" fontWeight={700}>{order.progress_percent}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={order.progress_percent || 0} sx={{ height: 7, borderRadius: 4, mt: 0.5 }} />
                    </Box>
                  </Box>
                ))}
                {!dashboardQuery.isLoading && (data?.priorities || []).length === 0 && (
                  <Typography textAlign="center" color="text.secondary" py={4}>
                    No hay prioridades activas para mostrar.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <WarningAmberIcon color="warning" />
                    <Typography variant="h6">Tareas activas</Typography>
                  </Box>
                  <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={1}>
                    <Box>
                      <Typography variant="h5">{data?.tasks?.pending ?? 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Pendientes</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h5">{data?.tasks?.in_progress ?? 0}</Typography>
                      <Typography variant="caption" color="text.secondary">En proceso</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h5">{data?.tasks?.completed ?? 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Completadas</Typography>
                    </Box>
                  </Box>
                  <Stack spacing={1}>
                    {(data?.tasks?.by_operator || []).map((row) => (
                      <Box key={`${row.operator}-${row.task_type}`} display="flex" justifyContent="space-between" gap={1}>
                        <Typography variant="body2">{row.operator}</Typography>
                        <Typography variant="body2" fontWeight={700}>{row.total}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="h6">Estado API</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Healthcheck: {healthQuery.data?.status || "consultando"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Version: {healthQuery.data?.version || "0.1.0"}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}

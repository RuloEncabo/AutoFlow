import FullscreenIcon from "@mui/icons-material/Fullscreen";
import RefreshIcon from "@mui/icons-material/Refresh";
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

import { getTvWorkOrders } from "../../api/dashboardApi.js";
import { getApiErrorMessage } from "../../api/errorUtils.js";
import StatusChip from "../../components/StatusChip.jsx";

const refreshSeconds = Number(import.meta.env.VITE_TV_REFRESH_SECONDS || 30);

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T00:00:00`));
}

export default function TvDashboardPage() {
  const tvQuery = useQuery({
    queryKey: ["tv-dashboard", "work-orders"],
    queryFn: getTvWorkOrders,
    refetchInterval: refreshSeconds * 1000,
  });

  const rows = tvQuery.data?.rows || [];
  const openFullscreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    }
  };

  return (
    <Stack spacing={3} sx={{ minHeight: "calc(100vh - 120px)" }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h4">Dashboard TV</Typography>
          <Typography color="text.secondary">
            Vehiculos activos, avance, sector actual y proximas tareas del taller.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => tvQuery.refetch()} disabled={tvQuery.isFetching}>
            {refreshSeconds}s
          </Button>
          <Button variant="contained" startIcon={<FullscreenIcon />} onClick={openFullscreen}>
            Pantalla completa
          </Button>
        </Stack>
      </Box>

      {tvQuery.isError && <Alert severity="error">{getApiErrorMessage(tvQuery.error)}</Alert>}

      <Grid container spacing={3}>
        {rows.map((row) => (
          <Grid item xs={12} md={6} xl={4} key={row.id}>
            <Card sx={{ minHeight: 330 }}>
              <CardContent>
                <Stack spacing={2.2}>
                  <Box display="flex" justifyContent="space-between" gap={2} alignItems="flex-start">
                    <Box minWidth={0}>
                      <Typography variant="h3" lineHeight={1}>{row.plate}</Typography>
                      <Typography color="text.secondary" noWrap>{row.vehicle}</Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="h6">{row.order_number}</Typography>
                      <Typography variant="body2" color="text.secondary">{formatDate(row.estimated_delivery_date)}</Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="h5" noWrap>{row.client}</Typography>
                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
                      <StatusChip label={row.status_label} color="primary" />
                      <StatusChip label={row.priority_label} color={row.priority === "urgent" ? "error" : "default"} />
                      <StatusChip label={row.sector_current} color="success" />
                    </Stack>
                  </Box>
                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography fontWeight={700}>
                        {row.tasks_completed}/{row.tasks_total} tareas
                      </Typography>
                      <Typography fontWeight={700}>{row.progress_percent}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={row.progress_percent || 0} sx={{ height: 14, borderRadius: 7 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" mb={0.75}>Proximas tareas</Typography>
                    <Stack spacing={0.75}>
                      {(row.next_tasks || []).map((task) => (
                        <Box key={task.id} display="flex" justifyContent="space-between" gap={1}>
                          <Typography fontWeight={700} noWrap>{task.title}</Typography>
                          <Typography color="text.secondary" noWrap>{task.operator || task.sector || "-"}</Typography>
                        </Box>
                      ))}
                      {(row.next_tasks || []).length === 0 && (
                        <Typography color="text.secondary">Sin tareas pendientes.</Typography>
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {!tvQuery.isLoading && rows.length === 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography textAlign="center" color="text.secondary" py={6}>
                  No hay ordenes activas para mostrar en TV.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Stack>
  );
}

import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Box,
  Card,
  CardContent,
  InputAdornment,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { listAuditLogs, listSessionAudits } from "../../api/auditApi.js";
import { getApiErrorMessage } from "../../api/errorUtils.js";
import StatusChip from "../../components/StatusChip.jsx";

const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(value) {
  if (!value) return "-";
  return dateTimeFormatter.format(new Date(value));
}

export default function AuditPage() {
  const [tab, setTab] = useState("logs");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const params = { page: page + 1, page_size: rowsPerPage, search: search || undefined };
  const logsQuery = useQuery({
    queryKey: ["audit", "logs", params],
    queryFn: () => listAuditLogs(params),
    enabled: tab === "logs",
  });
  const sessionsQuery = useQuery({
    queryKey: ["audit", "sessions", params],
    queryFn: () => listSessionAudits(params),
    enabled: tab === "sessions",
  });

  const activeQuery = tab === "logs" ? logsQuery : sessionsQuery;
  const rows = activeQuery.data?.results || [];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Auditoria</Typography>
        <Typography color="text.secondary">
          Trazabilidad de acciones, cambios de datos, IP, sesion y eventos de autenticacion.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Tabs value={tab} onChange={(_, value) => { setTab(value); setPage(0); }} sx={{ mb: 2 }}>
            <Tab label="Cambios" value="logs" />
            <Tab label="Sesiones" value="sessions" />
          </Tabs>
          <TextField
            fullWidth
            placeholder="Buscar por usuario, modulo, accion, objeto, IP o sesion"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          {activeQuery.isError && <Alert severity="error">{getApiErrorMessage(activeQuery.error)}</Alert>}

          {tab === "logs" ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Modulo</TableCell>
                    <TableCell>Accion</TableCell>
                    <TableCell>Objeto</TableCell>
                    <TableCell>IP / sesion</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{formatDateTime(row.created_at)}</TableCell>
                      <TableCell>{row.user_email || "sistema"}</TableCell>
                      <TableCell>{row.module}</TableCell>
                      <TableCell><StatusChip label={row.action_label || row.action} color="primary" /></TableCell>
                      <TableCell>
                        <Typography>{row.object_type || "-"}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.object_id || ""}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography>{row.ip_address || "-"}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.session_key || "sin sesion"}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Evento</TableCell>
                    <TableCell>IP</TableCell>
                    <TableCell>Sesion</TableCell>
                    <TableCell>User agent</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{formatDateTime(row.created_at)}</TableCell>
                      <TableCell>{row.user_email || "sistema"}</TableCell>
                      <TableCell><StatusChip label={row.event_label || row.event} color="primary" /></TableCell>
                      <TableCell>{row.ip_address || "-"}</TableCell>
                      <TableCell>{row.session_key || "sin sesion"}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap maxWidth={320}>
                          {row.user_agent || "-"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {!activeQuery.isLoading && rows.length === 0 && (
            <Typography textAlign="center" color="text.secondary" py={4}>
              No hay registros de auditoria para mostrar.
            </Typography>
          )}
          <TablePagination
            component="div"
            count={activeQuery.data?.count || 0}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[5, 10, 20]}
            onPageChange={(_, next) => setPage(next)}
            onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }}
            labelRowsPerPage="Filas"
          />
        </CardContent>
      </Card>
    </Stack>
  );
}

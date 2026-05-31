import AddIcon from "@mui/icons-material/Add";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EmailIcon from "@mui/icons-material/Email";
import SearchIcon from "@mui/icons-material/Search";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  cancelAppointment,
  confirmAppointment,
  createAppointment,
  deleteAppointment,
  listAppointmentCommunications,
  listAppointments,
  sendAppointmentEmail,
  sendAppointmentWhatsapp,
  updateAppointment,
} from "../../api/appointmentsApi.js";
import { listClients } from "../../api/clientsApi.js";
import { getApiErrorMessage } from "../../api/errorUtils.js";
import { listVehicles } from "../../api/vehiclesApi.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import StatusChip from "../../components/StatusChip.jsx";

const emptyAppointment = {
  client: "",
  vehicle: "",
  date: "",
  time: "",
  status: "scheduled",
  notes: "",
};

const statusLabels = {
  scheduled: "Programado",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  completed: "Completado",
};

const statusColors = {
  scheduled: "primary",
  confirmed: "success",
  cancelled: "error",
  completed: "default",
};

function toLocalFormParts(value) {
  if (!value) return { date: "", time: "" };
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function buildScheduledAt(date, time) {
  if (!date || !time) return "";
  return new Date(`${date}T${time}:00`).toISOString();
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [form, setForm] = useState(emptyAppointment);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [communicationsTarget, setCommunicationsTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const appointmentsQuery = useQuery({
    queryKey: ["appointments", { page, rowsPerPage, search }],
    queryFn: () =>
      listAppointments({
        page: page + 1,
        page_size: rowsPerPage,
        search: search || undefined,
      }),
  });

  const clientsQuery = useQuery({
    queryKey: ["clients", "options"],
    queryFn: () => listClients({ page_size: 100, ordering: "last_name" }),
  });

  const vehiclesQuery = useQuery({
    queryKey: ["vehicles", "options"],
    queryFn: () => listVehicles({ page_size: 100, ordering: "plate" }),
  });

  const communicationsQuery = useQuery({
    queryKey: ["appointment-communications", communicationsTarget?.id],
    queryFn: () => listAppointmentCommunications(communicationsTarget.id),
    enabled: Boolean(communicationsTarget),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        client: form.client,
        vehicle: form.vehicle || null,
        scheduled_at: buildScheduledAt(form.date, form.time),
        status: form.status,
        notes: form.notes,
      };
      return editingAppointment
        ? updateAppointment(editingAppointment.id, payload)
        : createAppointment(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setDeleteTarget(null);
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }) => {
      if (action === "confirm") return confirmAppointment(id);
      if (action === "cancel") return cancelAppointment(id);
      if (action === "email") return sendAppointmentEmail(id);
      return sendAppointmentWhatsapp(id);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointment-communications"] });
      const label = variables.action === "email" || variables.action === "whatsapp"
        ? `Comunicacion ${data.status}`
        : "Turno actualizado";
      setToast({ severity: data.status === "failed" ? "warning" : "success", message: label });
    },
    onError: (error) => {
      setToast({ severity: "error", message: getApiErrorMessage(error) });
    },
  });

  const rows = appointmentsQuery.data?.results || [];
  const count = appointmentsQuery.data?.count || 0;
  const clients = clientsQuery.data?.results || [];
  const vehicles = vehiclesQuery.data?.results || [];
  const filteredVehicles = form.client ? vehicles.filter((vehicle) => vehicle.client === form.client) : vehicles;

  const openCreate = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const parts = toLocalFormParts(now.toISOString());
    setEditingAppointment(null);
    setForm({
      ...emptyAppointment,
      client: clients[0]?.id || "",
      date: parts.date,
      time: parts.time,
    });
    setDialogOpen(true);
  };

  const openEdit = (appointment) => {
    const parts = toLocalFormParts(appointment.scheduled_at);
    setEditingAppointment(appointment);
    setForm({
      client: appointment.client || "",
      vehicle: appointment.vehicle || "",
      date: parts.date,
      time: parts.time,
      status: appointment.status || "scheduled",
      notes: appointment.notes || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingAppointment(null);
    setForm(emptyAppointment);
    saveMutation.reset();
  };

  const updateForm = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "client" && current.client !== value) {
        next.vehicle = "";
      }
      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h4">Turnos</Typography>
          <Typography color="text.secondary">
            Agenda de citas, confirmacion y comunicaciones por email o WhatsApp preparado.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nuevo turno
        </Button>
      </Box>

      {toast && (
        <Alert severity={toast.severity} onClose={() => setToast(null)}>
          {toast.message}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TextField
            placeholder="Buscar por cliente, patente, vehiculo u observaciones"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          {appointmentsQuery.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {getApiErrorMessage(appointmentsQuery.error, "No se pudieron cargar los turnos.")}
            </Alert>
          )}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha y hora</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Vehiculo</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Comunicaciones</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((appointment) => (
                  <TableRow key={appointment.id} hover>
                    <TableCell>
                      <Typography fontWeight={700}>{formatDateTime(appointment.scheduled_at)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {appointment.notes || "Sin observaciones"}
                      </Typography>
                    </TableCell>
                    <TableCell>{appointment.client_name}</TableCell>
                    <TableCell>{appointment.vehicle_label || "-"}</TableCell>
                    <TableCell>
                      <StatusChip
                        label={statusLabels[appointment.status] || appointment.status}
                        color={statusColors[appointment.status] || "default"}
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => setCommunicationsTarget(appointment)}>
                        Ver ({appointment.communications_count || 0})
                      </Button>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Confirmar">
                        <span>
                          <IconButton
                            color="success"
                            disabled={appointment.status === "confirmed" || actionMutation.isPending}
                            onClick={() => actionMutation.mutate({ id: appointment.id, action: "confirm" })}
                            aria-label="Confirmar turno"
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Cancelar">
                        <span>
                          <IconButton
                            color="warning"
                            disabled={appointment.status === "cancelled" || actionMutation.isPending}
                            onClick={() => actionMutation.mutate({ id: appointment.id, action: "cancel" })}
                            aria-label="Cancelar turno"
                          >
                            <CancelIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Enviar email">
                        <IconButton
                          onClick={() => actionMutation.mutate({ id: appointment.id, action: "email" })}
                          aria-label="Enviar email"
                        >
                          <EmailIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Enviar WhatsApp">
                        <IconButton
                          onClick={() => actionMutation.mutate({ id: appointment.id, action: "whatsapp" })}
                          aria-label="Enviar WhatsApp"
                        >
                          <WhatsAppIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton onClick={() => openEdit(appointment)} aria-label="Editar turno">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Dar de baja">
                        <IconButton
                          color="error"
                          onClick={() => setDeleteTarget(appointment)}
                          aria-label="Dar de baja turno"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!appointmentsQuery.isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary" textAlign="center" py={4}>
                        No hay turnos para mostrar.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={count}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[5, 10, 20, 50]}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(0);
            }}
            labelRowsPerPage="Filas"
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editingAppointment ? "Editar turno" : "Nuevo turno"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} pt={1}>
              {saveMutation.isError && (
                <Alert severity="error">
                  {getApiErrorMessage(saveMutation.error, "No se pudo guardar el turno.")}
                </Alert>
              )}
              {clients.length === 0 && (
                <Alert severity="info">Para crear un turno primero debe existir al menos un cliente.</Alert>
              )}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField label="Cliente" select value={form.client} onChange={updateForm("client")} required fullWidth>
                    {clients.map((client) => (
                      <MenuItem key={client.id} value={client.id}>
                        {client.full_name} {client.document ? `- ${client.document}` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Vehiculo" select value={form.vehicle} onChange={updateForm("vehicle")} fullWidth>
                    <MenuItem value="">Sin vehiculo</MenuItem>
                    {filteredVehicles.map((vehicle) => (
                      <MenuItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} - {vehicle.brand} {vehicle.model}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="Fecha" type="date" value={form.date} onChange={updateForm("date")} required fullWidth InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="Hora" type="time" value={form.time} onChange={updateForm("time")} required fullWidth InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="Estado" select value={form.status} onChange={updateForm("status")} fullWidth>
                    <MenuItem value="scheduled">Programado</MenuItem>
                    <MenuItem value="confirmed">Confirmado</MenuItem>
                    <MenuItem value="cancelled">Cancelado</MenuItem>
                    <MenuItem value="completed">Completado</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Observaciones"
                    value={form.notes}
                    onChange={updateForm("notes")}
                    fullWidth
                    multiline
                    minRows={3}
                  />
                </Grid>
              </Grid>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} disabled={saveMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={saveMutation.isPending || clients.length === 0}>
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(communicationsTarget)} onClose={() => setCommunicationsTarget(null)} maxWidth="md" fullWidth>
        <DialogTitle>Comunicaciones del turno</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} pt={1}>
            {communicationsQuery.data?.map((item) => (
              <Card key={item.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" gap={2} flexWrap="wrap">
                    <Box>
                      <Typography fontWeight={700}>{item.channel.toUpperCase()} - {item.recipient || "Sin destinatario"}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.sent_at ? formatDateTime(item.sent_at) : formatDateTime(item.created_at)}
                      </Typography>
                    </Box>
                    <StatusChip label={item.status} color={item.status === "sent" ? "success" : item.status === "failed" ? "error" : "primary"} />
                  </Stack>
                  {item.error_message && (
                    <Alert severity="warning" sx={{ mt: 1.5 }}>
                      {item.error_message}
                    </Alert>
                  )}
                  <Typography variant="body2" sx={{ whiteSpace: "pre-line", mt: 1.5 }}>
                    {item.message}
                  </Typography>
                </CardContent>
              </Card>
            ))}
            {!communicationsQuery.isLoading && (communicationsQuery.data || []).length === 0 && (
              <Typography color="text.secondary">No hay comunicaciones registradas.</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommunicationsTarget(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Dar de baja turno"
        message={`Se dara de baja el turno de ${deleteTarget?.client_name || "este cliente"}.`}
        confirmLabel="Dar de baja"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </Stack>
  );
}


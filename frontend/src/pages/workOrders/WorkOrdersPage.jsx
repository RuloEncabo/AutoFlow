import AddIcon from "@mui/icons-material/Add";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, InputAdornment, LinearProgress, MenuItem, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { listClients } from "../../api/clientsApi.js";
import { getApiErrorMessage } from "../../api/errorUtils.js";
import { listOperators } from "../../api/operatorsApi.js";
import { listTasks as listTaskCatalog } from "../../api/tasksApi.js";
import { listVehicles } from "../../api/vehiclesApi.js";
import {
  changeWorkOrderStatus, createWorkOrder, createWorkOrderTask, deleteWorkOrder,
  downloadWorkOrderPdf, listWorkOrders, listWorkOrderTasks, updateWorkOrder,
} from "../../api/workOrdersApi.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import StatusChip from "../../components/StatusChip.jsx";

const statuses = [
  ["scheduled", "Programado"], ["received", "Recibido"], ["estimating", "Presupuestando"],
  ["approved", "Aprobado"], ["waiting_parts", "Esperando piezas"], ["in_repair", "En reparacion"],
  ["in_paint", "En pintura"], ["finished", "Terminado"], ["delivered", "Entregado"], ["cancelled", "Cancelado"],
];
const priorities = [["low", "Baja"], ["normal", "Normal"], ["high", "Alta"], ["urgent", "Urgente"]];
const emptyOrder = { client: "", vehicle: "", priority: "normal", status: "scheduled", description: "", notes: "", estimated_delivery_date: "" };
const emptyTask = { task_template: "", operator: "", title: "", description: "", status: "pending", priority: "normal", sector: "", execution_order: 1, estimated_minutes: 0 };

function formatMinutes(minutes) {
  const value = Number(minutes || 0);
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const remaining = value % 60;
  return remaining ? `${hours} h ${remaining} min` : `${hours} h`;
}

export default function WorkOrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyOrder);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [taskOrder, setTaskOrder] = useState(null);
  const [taskForm, setTaskForm] = useState(emptyTask);

  const ordersQuery = useQuery({ queryKey: ["work-orders", page, rowsPerPage, search], queryFn: () => listWorkOrders({ page: page + 1, page_size: rowsPerPage, search: search || undefined }) });
  const clientsQuery = useQuery({ queryKey: ["clients", "options"], queryFn: () => listClients({ page_size: 100 }) });
  const vehiclesQuery = useQuery({ queryKey: ["vehicles", "options"], queryFn: () => listVehicles({ page_size: 100 }) });
  const taskCatalogQuery = useQuery({ queryKey: ["task-catalog", "options"], queryFn: () => listTaskCatalog({ page_size: 100, status: "active" }) });
  const operatorsQuery = useQuery({ queryKey: ["operators", "options"], queryFn: () => listOperators({ page_size: 100, status: "active" }) });
  const tasksQuery = useQuery({ queryKey: ["work-order-tasks", taskOrder?.id], queryFn: () => listWorkOrderTasks(taskOrder.id), enabled: Boolean(taskOrder) });

  const clients = clientsQuery.data?.results || [];
  const vehicles = vehiclesQuery.data?.results || [];
  const taskCatalog = taskCatalogQuery.data?.results || [];
  const operators = operatorsQuery.data?.results || [];
  const filteredVehicles = form.client ? vehicles.filter((vehicle) => vehicle.client === form.client) : vehicles;
  const rows = ordersQuery.data?.results || [];

  const saveMutation = useMutation({
    mutationFn: () => editing ? updateWorkOrder(editing.id, form) : createWorkOrder(form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["work-orders"] }); closeForm(); },
  });
  const deleteMutation = useMutation({ mutationFn: (id) => deleteWorkOrder(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["work-orders"] }); setDeleteTarget(null); } });
  const statusMutation = useMutation({ mutationFn: ({ id, status }) => changeWorkOrderStatus(id, status), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["work-orders"] }) });
  const taskMutation = useMutation({ mutationFn: () => createWorkOrderTask(taskOrder.id, taskForm), onSuccess: () => { setTaskForm(emptyTask); queryClient.invalidateQueries({ queryKey: ["work-order-tasks"] }); queryClient.invalidateQueries({ queryKey: ["work-orders"] }); } });

  const openCreate = () => { setEditing(null); setForm({ ...emptyOrder, client: clients[0]?.id || "" }); setFormOpen(true); };
  const openEdit = (order) => { setEditing(order); setForm({ client: order.client, vehicle: order.vehicle, priority: order.priority, status: order.status, description: order.description, notes: order.notes || "", estimated_delivery_date: order.estimated_delivery_date || "" }); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); setForm(emptyOrder); saveMutation.reset(); };
  const updateForm = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value, ...(field === "client" ? { vehicle: "" } : {}) }));
  const openTaskDialog = (order) => {
    setTaskOrder(order);
    setTaskForm(emptyTask);
    taskMutation.reset();
  };
  const updateTaskTemplate = (event) => {
    const taskTemplate = taskCatalog.find((task) => task.id === event.target.value);
    setTaskForm((current) => ({
      ...current,
      task_template: event.target.value,
      title: taskTemplate?.name || "",
      description: taskTemplate?.description || "",
      estimated_minutes: taskTemplate?.estimated_minutes || 0,
    }));
  };

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" gap={2} flexWrap="wrap">
        <Box><Typography variant="h4">Ordenes de trabajo</Typography><Typography color="text.secondary">Gestion de estados, tareas y avance operativo.</Typography></Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Nueva orden</Button>
      </Box>
      <Card><CardContent>
        <TextField fullWidth placeholder="Buscar por orden, cliente, patente o descripcion" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} sx={{ mb: 2 }} />
        {ordersQuery.isError && <Alert severity="error">{getApiErrorMessage(ordersQuery.error)}</Alert>}
        <TableContainer><Table><TableHead><TableRow><TableCell>Orden</TableCell><TableCell>Cliente / vehiculo</TableCell><TableCell>Estado</TableCell><TableCell>Prioridad</TableCell><TableCell>Avance</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
          <TableBody>{rows.map((order) => (
            <TableRow key={order.id} hover>
              <TableCell><Typography fontWeight={700}>{order.order_number}</Typography><Typography variant="body2" color="text.secondary">{order.estimated_delivery_date || "Sin fecha estimada"}</Typography></TableCell>
              <TableCell><Typography>{order.client_name}</Typography><Typography variant="body2" color="text.secondary">{order.vehicle_label}</Typography></TableCell>
              <TableCell><StatusChip label={statuses.find(([v]) => v === order.status)?.[1] || order.status} color="primary" /></TableCell>
              <TableCell>{priorities.find(([v]) => v === order.priority)?.[1] || order.priority}</TableCell>
              <TableCell sx={{ minWidth: 160 }}><Typography variant="body2">{order.tasks_completed}/{order.tasks_total} tareas</Typography><LinearProgress variant="determinate" value={order.progress_percent || 0} sx={{ height: 8, borderRadius: 4 }} /></TableCell>
              <TableCell align="right">
                <Tooltip title="Descargar PDF"><IconButton color="primary" onClick={() => downloadWorkOrderPdf(order.id, `${order.order_number}.pdf`)}><PictureAsPdfIcon /></IconButton></Tooltip>
                <Tooltip title="Tareas"><IconButton onClick={() => openTaskDialog(order)}><AssignmentIcon /></IconButton></Tooltip>
                <Tooltip title="Marcar terminado"><IconButton color="success" onClick={() => statusMutation.mutate({ id: order.id, status: "finished" })}><CheckCircleIcon /></IconButton></Tooltip>
                <Tooltip title="Editar"><IconButton onClick={() => openEdit(order)}><EditIcon /></IconButton></Tooltip>
                <Tooltip title="Dar de baja"><IconButton color="error" onClick={() => setDeleteTarget(order)}><DeleteIcon /></IconButton></Tooltip>
              </TableCell>
            </TableRow>
          ))}{!ordersQuery.isLoading && rows.length === 0 && <TableRow><TableCell colSpan={6}><Typography textAlign="center" color="text.secondary" py={4}>No hay ordenes.</Typography></TableCell></TableRow>}</TableBody>
        </Table></TableContainer>
        <TablePagination component="div" count={ordersQuery.data?.count || 0} page={page} rowsPerPage={rowsPerPage} rowsPerPageOptions={[5, 10, 20]} onPageChange={(_, next) => setPage(next)} onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }} labelRowsPerPage="Filas" />
      </CardContent></Card>

      <Dialog open={formOpen} onClose={closeForm} maxWidth="md" fullWidth><Box component="form" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }}>
        <DialogTitle>{editing ? "Editar orden" : "Nueva orden"}</DialogTitle><DialogContent><Stack spacing={2} pt={1}>
          {saveMutation.isError && <Alert severity="error">{getApiErrorMessage(saveMutation.error)}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}><TextField select label="Cliente" value={form.client} onChange={updateForm("client")} required fullWidth>{clients.map((client) => <MenuItem key={client.id} value={client.id}>{client.full_name}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={6}><TextField select label="Vehiculo" value={form.vehicle} onChange={updateForm("vehicle")} required fullWidth>{filteredVehicles.map((vehicle) => <MenuItem key={vehicle.id} value={vehicle.id}>{vehicle.plate} - {vehicle.brand} {vehicle.model}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={4}><TextField select label="Estado" value={form.status} onChange={updateForm("status")} fullWidth>{statuses.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={4}><TextField select label="Prioridad" value={form.priority} onChange={updateForm("priority")} fullWidth>{priorities.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={4}><TextField type="date" label="Entrega estimada" value={form.estimated_delivery_date} onChange={updateForm("estimated_delivery_date")} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}><TextField label="Descripcion" value={form.description} onChange={updateForm("description")} required fullWidth multiline minRows={3} /></Grid>
            <Grid item xs={12}><TextField label="Observaciones" value={form.notes} onChange={updateForm("notes")} fullWidth multiline minRows={2} /></Grid>
          </Grid>
        </Stack></DialogContent><DialogActions><Button onClick={closeForm}>Cancelar</Button><Button type="submit" variant="contained" disabled={saveMutation.isPending}>Guardar</Button></DialogActions>
      </Box></Dialog>

      <Dialog open={Boolean(taskOrder)} onClose={() => setTaskOrder(null)} maxWidth="md" fullWidth>
        <DialogTitle>Tareas de {taskOrder?.order_number}</DialogTitle><DialogContent><Stack spacing={2} pt={1}>
          {taskMutation.isError && <Alert severity="error">{getApiErrorMessage(taskMutation.error)}</Alert>}
          {(taskCatalog.length === 0 || operators.length === 0) && (
            <Alert severity="info">
              Para asignar tareas a una orden primero debe existir al menos una tarea activa y un operario activo.
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField select label="Tarea" value={taskForm.task_template} onChange={updateTaskTemplate} required fullWidth>
                {taskCatalog.map((task) => <MenuItem key={task.id} value={task.id}>{task.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select label="Operario" value={taskForm.operator} onChange={(e) => setTaskForm((c) => ({ ...c, operator: e.target.value }))} required fullWidth>
                {operators.map((operator) => <MenuItem key={operator.id} value={operator.id}>{operator.full_name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}><TextField type="number" label="Tiempo min" value={taskForm.estimated_minutes} onChange={(e) => setTaskForm((c) => ({ ...c, estimated_minutes: Number(e.target.value) }))} fullWidth inputProps={{ min: 1 }} /></Grid>
            <Grid item xs={12} md={2}><TextField type="number" label="Orden" value={taskForm.execution_order} onChange={(e) => setTaskForm((c) => ({ ...c, execution_order: Number(e.target.value) }))} fullWidth /></Grid>
            <Grid item xs={12} md={5}><TextField label="Titulo en orden" value={taskForm.title} onChange={(e) => setTaskForm((c) => ({ ...c, title: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={12} md={4}><TextField label="Sector" value={taskForm.sector} onChange={(e) => setTaskForm((c) => ({ ...c, sector: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={12} md={3}><Button variant="contained" fullWidth sx={{ height: 40 }} onClick={() => taskMutation.mutate()} disabled={!taskForm.task_template || !taskForm.operator || taskMutation.isPending}>Agregar tarea</Button></Grid>
          </Grid>
          <Table size="small"><TableHead><TableRow><TableCell>Tarea</TableCell><TableCell>Operario</TableCell><TableCell>Tiempo</TableCell><TableCell>Sector</TableCell><TableCell>Estado</TableCell></TableRow></TableHead><TableBody>{(tasksQuery.data || []).map((task) => <TableRow key={task.id}><TableCell><Typography fontWeight={700}>{task.title}</Typography><Typography variant="caption" color="text.secondary">{task.task_template_name || "Manual"}</Typography></TableCell><TableCell>{task.operator_name || "Sin asignar"}</TableCell><TableCell>{formatMinutes(task.estimated_minutes)}</TableCell><TableCell>{task.sector || "-"}</TableCell><TableCell>{task.status}</TableCell></TableRow>)}</TableBody></Table>
        </Stack></DialogContent><DialogActions><Button onClick={() => setTaskOrder(null)}>Cerrar</Button></DialogActions>
      </Dialog>

      <ConfirmDialog open={Boolean(deleteTarget)} title="Dar de baja orden" message={`Se dara de baja ${deleteTarget?.order_number || "esta orden"}.`} confirmLabel="Dar de baja" loading={deleteMutation.isPending} onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} />
    </Stack>
  );
}

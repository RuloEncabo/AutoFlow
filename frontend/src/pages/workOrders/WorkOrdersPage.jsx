import AddIcon from "@mui/icons-material/Add";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, InputAdornment, LinearProgress, MenuItem, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSelector } from "react-redux";

import { listClients } from "../../api/clientsApi.js";
import { getApiErrorMessage } from "../../api/errorUtils.js";
import {
  createWorkOrderMaterial,
  createWorkOrderPart,
  listMaterials,
  listParts,
  listWorkOrderMaterials,
  listWorkOrderParts,
} from "../../api/inventoryApi.js";
import { listOperators } from "../../api/operatorsApi.js";
import { listTasks as listTaskCatalog } from "../../api/tasksApi.js";
import { listVehicles } from "../../api/vehiclesApi.js";
import {
  changeWorkOrderStatus, completeWorkOrderTask, createWorkOrder, createWorkOrderTask, deleteWorkOrder,
  exportWorkOrders, listWorkOrders, listWorkOrderTasks, updateWorkOrder,
} from "../../api/workOrdersApi.js";
import { ROLES } from "../../auth/roles.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import StatusChip from "../../components/StatusChip.jsx";
import { downloadWorkOrderPdf } from "../../pdf/billingPdf.jsx";

const statuses = [
  ["scheduled", "Programado"], ["received", "Recibido"], ["estimating", "Presupuestando"],
  ["approved", "Aprobado"], ["waiting_parts", "Esperando piezas"], ["in_repair", "En reparacion"],
  ["in_paint", "En pintura"], ["finished", "Terminado"], ["delivered", "Entregado"], ["closed", "Cerrada"], ["cancelled", "Cancelado"],
];
const priorities = [["low", "Baja"], ["normal", "Normal"], ["high", "Alta"], ["urgent", "Urgente"]];
const emptyOrder = { client: "", vehicle: "", priority: "normal", status: "scheduled", description: "", notes: "", estimated_delivery_date: "" };
const emptyTask = { task_template: "", operator: "", title: "", description: "", status: "pending", priority: "normal", sector: "", execution_order: 1, estimated_hours: 0, estimated_minutes_part: 0, labor_cost: "0.00" };
const emptyPartUsage = { part: "", quantity: 1, unit_cost: "" };
const emptyMaterialUsage = { material: "", quantity: 1, unit_cost: "" };
const moneyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const statusColors = {
  closed: "success",
  cancelled: "error",
  delivered: "success",
  finished: "primary",
};

function statusLabel(status) {
  return statuses.find(([value]) => value === status)?.[1] || status;
}

function statusColor(status) {
  return statusColors[status] || "primary";
}

function formatMinutes(minutes) {
  const value = Number(minutes || 0);
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const remaining = value % 60;
  return remaining ? `${hours} h ${remaining} min` : `${hours} h`;
}

function splitMinutes(minutes) {
  const value = Number(minutes || 0);
  return {
    estimated_hours: Math.floor(value / 60),
    estimated_minutes_part: value % 60,
  };
}

function buildTaskPayload(form) {
  return {
    task_template: form.task_template,
    operator: form.operator,
    title: form.title,
    description: form.description,
    status: form.status,
    priority: form.priority,
    sector: form.sector,
    execution_order: Number(form.execution_order || 1),
    estimated_minutes: Number(form.estimated_hours || 0) * 60 + Number(form.estimated_minutes_part || 0),
    labor_cost: form.labor_cost,
  };
}

export default function WorkOrdersPage() {
  const queryClient = useQueryClient();
  const user = useSelector((state) => state.auth.user);
  const isAdmin = user?.role === ROLES.ADMIN;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [closedPage, setClosedPage] = useState(0);
  const [closedRowsPerPage, setClosedRowsPerPage] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyOrder);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [taskOrder, setTaskOrder] = useState(null);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [partForm, setPartForm] = useState(emptyPartUsage);
  const [materialForm, setMaterialForm] = useState(emptyMaterialUsage);
  const [toast, setToast] = useState(null);

  const ordersQuery = useQuery({
    queryKey: ["work-orders", "active", page, rowsPerPage, search],
    queryFn: () => listWorkOrders({
      page: page + 1,
      page_size: rowsPerPage,
      search: search || undefined,
      is_closed: false,
    }),
  });
  const closedOrdersQuery = useQuery({
    queryKey: ["work-orders", "closed", closedPage, closedRowsPerPage, search],
    queryFn: () => listWorkOrders({
      page: closedPage + 1,
      page_size: closedRowsPerPage,
      search: search || undefined,
      is_closed: true,
    }),
  });
  const clientsQuery = useQuery({ queryKey: ["clients", "options"], queryFn: () => listClients({ page_size: 100 }) });
  const vehiclesQuery = useQuery({ queryKey: ["vehicles", "options"], queryFn: () => listVehicles({ page_size: 100 }) });
  const taskCatalogQuery = useQuery({ queryKey: ["task-catalog", "options"], queryFn: () => listTaskCatalog({ page_size: 100, status: "active" }) });
  const operatorsQuery = useQuery({ queryKey: ["operators", "options"], queryFn: () => listOperators({ page_size: 100, status: "active" }) });
  const partsCatalogQuery = useQuery({ queryKey: ["parts", "options"], queryFn: () => listParts({ page_size: 100, status: "active" }) });
  const materialsCatalogQuery = useQuery({ queryKey: ["materials", "options"], queryFn: () => listMaterials({ page_size: 100, status: "active" }) });
  const tasksQuery = useQuery({ queryKey: ["work-order-tasks", taskOrder?.id], queryFn: () => listWorkOrderTasks(taskOrder.id), enabled: Boolean(taskOrder) });
  const orderPartsQuery = useQuery({ queryKey: ["work-order-parts", taskOrder?.id], queryFn: () => listWorkOrderParts({ work_order: taskOrder.id, page_size: 100 }), enabled: Boolean(taskOrder) });
  const orderMaterialsQuery = useQuery({ queryKey: ["work-order-materials", taskOrder?.id], queryFn: () => listWorkOrderMaterials({ work_order: taskOrder.id, page_size: 100 }), enabled: Boolean(taskOrder) });

  const clients = clientsQuery.data?.results || [];
  const vehicles = vehiclesQuery.data?.results || [];
  const taskCatalog = taskCatalogQuery.data?.results || [];
  const operators = operatorsQuery.data?.results || [];
  const partsCatalog = partsCatalogQuery.data?.results || [];
  const materialsCatalog = materialsCatalogQuery.data?.results || [];
  const orderParts = orderPartsQuery.data?.results || [];
  const orderMaterials = orderMaterialsQuery.data?.results || [];
  const filteredVehicles = form.client ? vehicles.filter((vehicle) => vehicle.client === form.client) : vehicles;
  const activeRows = ordersQuery.data?.results || [];
  const closedRows = closedOrdersQuery.data?.results || [];
  const selectedOrder = [...activeRows, ...closedRows].find((order) => order.id === taskOrder?.id) || taskOrder;
  const selectedOrderClosed = selectedOrder?.status === "closed";
  const canEditSelectedOrder = !selectedOrderClosed || isAdmin;
  const canEditOrder = (order) => order.status !== "closed" || isAdmin;
  const canCloseOrder = (order) => (
    order.status !== "closed"
    && order.status !== "cancelled"
    && Number(order.tasks_total || 0) > 0
    && Number(order.tasks_pending || 0) === 0
  );

  const saveMutation = useMutation({
    mutationFn: () => editing ? updateWorkOrder(editing.id, form) : createWorkOrder(form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["work-orders"] }); closeForm(); },
  });
  const deleteMutation = useMutation({ mutationFn: (id) => deleteWorkOrder(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["work-orders"] }); setDeleteTarget(null); } });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => changeWorkOrderStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["work-orders"] }),
    onError: (error) => setToast({ severity: "error", message: getApiErrorMessage(error, "No se pudo cambiar el estado de la orden.") }),
  });
  const taskMutation = useMutation({ mutationFn: () => createWorkOrderTask(taskOrder.id, buildTaskPayload(taskForm)), onSuccess: () => { setTaskForm(emptyTask); queryClient.invalidateQueries({ queryKey: ["work-order-tasks"] }); queryClient.invalidateQueries({ queryKey: ["work-orders"] }); } });
  const completeTaskMutation = useMutation({
    mutationFn: (id) => completeWorkOrderTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-order-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
    },
  });
  const partMutation = useMutation({
    mutationFn: () => createWorkOrderPart({ work_order: taskOrder.id, part: partForm.part, quantity: partForm.quantity, unit_cost: partForm.unit_cost || "0.00", status: "used" }),
    onSuccess: () => { setPartForm(emptyPartUsage); queryClient.invalidateQueries({ queryKey: ["work-order-parts"] }); queryClient.invalidateQueries({ queryKey: ["work-orders"] }); },
  });
  const materialMutation = useMutation({
    mutationFn: () => createWorkOrderMaterial({ work_order: taskOrder.id, material: materialForm.material, quantity: materialForm.quantity, unit_cost: materialForm.unit_cost || "0.00", status: "used" }),
    onSuccess: () => { setMaterialForm(emptyMaterialUsage); queryClient.invalidateQueries({ queryKey: ["work-order-materials"] }); queryClient.invalidateQueries({ queryKey: ["work-orders"] }); },
  });

  const openCreate = () => { setEditing(null); setForm({ ...emptyOrder, client: clients[0]?.id || "" }); setFormOpen(true); };
  const openEdit = (order) => {
    if (!canEditOrder(order)) {
      setToast({ severity: "warning", message: "La orden esta cerrada. Solo un administrador puede modificarla." });
      return;
    }
    setEditing(order);
    setForm({ client: order.client, vehicle: order.vehicle, priority: order.priority, status: order.status, description: order.description, notes: order.notes || "", estimated_delivery_date: order.estimated_delivery_date || "" });
    setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditing(null); setForm(emptyOrder); saveMutation.reset(); };
  const updateForm = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value, ...(field === "client" ? { vehicle: "" } : {}) }));
  const openTaskDialog = (order) => {
    setTaskOrder(order);
    setTaskForm(emptyTask);
    setPartForm(emptyPartUsage);
    setMaterialForm(emptyMaterialUsage);
    taskMutation.reset();
    completeTaskMutation.reset();
    partMutation.reset();
    materialMutation.reset();
  };
  const updateTaskTemplate = (event) => {
    const taskTemplate = taskCatalog.find((task) => task.id === event.target.value);
    setTaskForm((current) => ({
      ...current,
      task_template: event.target.value,
      title: taskTemplate?.name || "",
      description: taskTemplate?.description || "",
      ...splitMinutes(taskTemplate?.estimated_minutes || 0),
      labor_cost: taskTemplate?.labor_cost || "0.00",
    }));
  };

  const updatePartSelection = (event) => {
    const part = partsCatalog.find((item) => item.id === event.target.value);
    setPartForm((current) => ({ ...current, part: event.target.value, unit_cost: part?.cost || "" }));
  };

  const updateMaterialSelection = (event) => {
    const material = materialsCatalog.find((item) => item.id === event.target.value);
    setMaterialForm((current) => ({ ...current, material: event.target.value, unit_cost: material?.cost || "" }));
  };

  const handleExport = async (withItems = false) => {
    try {
      await exportWorkOrders(withItems);
    } catch (error) {
      setToast({ severity: "error", message: getApiErrorMessage(error, "No se pudo exportar ordenes.") });
    }
  };

  const handleDownloadPdf = async (order) => {
    try {
      await downloadWorkOrderPdf({ workOrder: order, filename: `orden_${order.order_number}.pdf` });
    } catch (error) {
      setToast({ severity: "error", message: getApiErrorMessage(error, "No se pudo generar el PDF de la orden.") });
    }
  };

  const renderOrderRows = (tableRows, emptyMessage, isLoading) => (
    <>
      {tableRows.map((order) => {
        const editable = canEditOrder(order);
        const closable = canCloseOrder(order);
        const deleteAllowed = isAdmin && editable;
        return (
          <TableRow key={order.id} hover>
            <TableCell><Typography fontWeight={700}>{order.order_number}</Typography><Typography variant="body2" color="text.secondary">{order.estimated_delivery_date || "Sin fecha estimada"}</Typography></TableCell>
            <TableCell><Typography>{order.client_name}</Typography><Typography variant="body2" color="text.secondary">{order.vehicle_label}</Typography></TableCell>
            <TableCell><StatusChip label={statusLabel(order.status)} color={statusColor(order.status)} /></TableCell>
            <TableCell>{priorities.find(([value]) => value === order.priority)?.[1] || order.priority}</TableCell>
            <TableCell sx={{ minWidth: 160 }}><Typography variant="body2">{order.tasks_completed}/{order.tasks_total} tareas</Typography><LinearProgress variant="determinate" value={order.progress_percent || 0} sx={{ height: 8, borderRadius: 4 }} /></TableCell>
            <TableCell>{moneyFormatter.format(Number(order.subtotal_amount || 0))}</TableCell>
            <TableCell align="right">
              <Tooltip title="Descargar PDF"><IconButton color="primary" onClick={() => handleDownloadPdf(order)}><PictureAsPdfIcon /></IconButton></Tooltip>
              <Tooltip title={editable ? "Tareas e insumos" : "Ver detalle"}>
                <IconButton onClick={() => openTaskDialog(order)}><AssignmentIcon /></IconButton>
              </Tooltip>
              {order.status !== "closed" && (
                <Tooltip title={closable ? "Terminado: cerrar orden" : "Complete todas las tareas para cerrar"}>
                  <span><IconButton color="success" disabled={!closable || statusMutation.isPending} onClick={() => statusMutation.mutate({ id: order.id, status: "closed" })}><CheckCircleIcon /></IconButton></span>
                </Tooltip>
              )}
              <Tooltip title={editable ? "Editar" : "Solo administrador"}>
                <span><IconButton disabled={!editable} onClick={() => openEdit(order)}><EditIcon /></IconButton></span>
              </Tooltip>
              <Tooltip title={deleteAllowed ? "Dar de baja" : "Solo administrador"}>
                <span><IconButton color="error" disabled={!deleteAllowed} onClick={() => setDeleteTarget(order)}><DeleteIcon /></IconButton></span>
              </Tooltip>
            </TableCell>
          </TableRow>
        );
      })}
      {!isLoading && tableRows.length === 0 && <TableRow><TableCell colSpan={7}><Typography textAlign="center" color="text.secondary" py={4}>{emptyMessage}</Typography></TableCell></TableRow>}
    </>
  );

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" gap={2} flexWrap="wrap">
        <Box><Typography variant="h4">Ordenes de trabajo</Typography><Typography color="text.secondary">Gestion de estados, tareas y avance operativo.</Typography></Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={() => handleExport(false)}>Excel</Button>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={() => handleExport(true)}>Excel con items</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Nueva orden</Button>
        </Stack>
      </Box>
      {toast && <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.message}</Alert>}
      <Card><CardContent>
        <TextField fullWidth placeholder="Buscar por orden, cliente, patente o descripcion" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); setClosedPage(0); }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} sx={{ mb: 2 }} />
        {ordersQuery.isError && <Alert severity="error">{getApiErrorMessage(ordersQuery.error)}</Alert>}
        <Typography variant="h6" gutterBottom>Ordenes activas</Typography>
        <TableContainer><Table><TableHead><TableRow><TableCell>Orden</TableCell><TableCell>Cliente / vehiculo</TableCell><TableCell>Estado</TableCell><TableCell>Prioridad</TableCell><TableCell>Avance</TableCell><TableCell>Subtotal</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
          <TableBody>{renderOrderRows(activeRows, "No hay ordenes activas.", ordersQuery.isLoading)}</TableBody>
        </Table></TableContainer>
        <TablePagination component="div" count={ordersQuery.data?.count || 0} page={page} rowsPerPage={rowsPerPage} rowsPerPageOptions={[5, 10, 20]} onPageChange={(_, next) => setPage(next)} onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }} labelRowsPerPage="Filas" />
      </CardContent></Card>

      <Card><CardContent>
        <Box display="flex" justifyContent="space-between" gap={2} flexWrap="wrap" mb={2}>
          <Box>
            <Typography variant="h6">Ordenes cerradas</Typography>
            <Typography variant="body2" color="text.secondary">Ordenes finalizadas, bloqueadas para edicion operativa.</Typography>
          </Box>
        </Box>
        {closedOrdersQuery.isError && <Alert severity="error">{getApiErrorMessage(closedOrdersQuery.error)}</Alert>}
        <TableContainer><Table><TableHead><TableRow><TableCell>Orden</TableCell><TableCell>Cliente / vehiculo</TableCell><TableCell>Estado</TableCell><TableCell>Prioridad</TableCell><TableCell>Avance</TableCell><TableCell>Subtotal</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
          <TableBody>{renderOrderRows(closedRows, "No hay ordenes cerradas.", closedOrdersQuery.isLoading)}</TableBody>
        </Table></TableContainer>
        <TablePagination component="div" count={closedOrdersQuery.data?.count || 0} page={closedPage} rowsPerPage={closedRowsPerPage} rowsPerPageOptions={[5, 10, 20]} onPageChange={(_, next) => setClosedPage(next)} onRowsPerPageChange={(event) => { setClosedRowsPerPage(Number(event.target.value)); setClosedPage(0); }} labelRowsPerPage="Filas" />
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

      <Dialog open={Boolean(taskOrder)} onClose={() => setTaskOrder(null)} maxWidth="lg" fullWidth>
        <DialogTitle>Detalle de {taskOrder?.order_number}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} pt={1}>
            <Grid container spacing={2}>
              {[
                ["Mano de obra", selectedOrder?.labor_amount],
                ["Materiales", selectedOrder?.materials_amount],
                ["Repuestos", selectedOrder?.parts_amount],
                ["Subtotal orden", selectedOrder?.subtotal_amount],
              ].map(([label, value]) => (
                <Grid item xs={12} md={3} key={label}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="h6">{moneyFormatter.format(Number(value || 0))}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {taskMutation.isError && <Alert severity="error">{getApiErrorMessage(taskMutation.error)}</Alert>}
            {selectedOrderClosed && (
              <Alert severity={canEditSelectedOrder ? "info" : "warning"}>
                Orden cerrada: {canEditSelectedOrder ? "como administrador puede modificar el detalle." : "solo un administrador puede modificar tareas, mano de obra, repuestos o materiales."}
              </Alert>
            )}
            {(taskCatalog.length === 0 || operators.length === 0) && (
              <Alert severity="info">
                Para asignar tareas a una orden primero debe existir al menos una tarea activa y un operario activo.
              </Alert>
            )}
            <Box>
              <Typography variant="h6" gutterBottom>Tareas asignadas</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField select label="Tarea" value={taskForm.task_template} onChange={updateTaskTemplate} required fullWidth disabled={!canEditSelectedOrder}>
                    {taskCatalog.map((task) => <MenuItem key={task.id} value={task.id}>{task.name}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField select label="Operario" value={taskForm.operator} onChange={(e) => setTaskForm((c) => ({ ...c, operator: e.target.value }))} required fullWidth disabled={!canEditSelectedOrder}>
                    {operators.map((operator) => <MenuItem key={operator.id} value={operator.id}>{operator.full_name}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={6} md={2}><TextField type="number" label="Horas" value={taskForm.estimated_hours} onChange={(e) => setTaskForm((c) => ({ ...c, estimated_hours: Number(e.target.value) }))} fullWidth inputProps={{ min: 0 }} disabled={!canEditSelectedOrder} /></Grid>
                <Grid item xs={6} md={2}><TextField type="number" label="Min" value={taskForm.estimated_minutes_part} onChange={(e) => setTaskForm((c) => ({ ...c, estimated_minutes_part: Number(e.target.value) }))} fullWidth inputProps={{ min: 0, max: 59 }} disabled={!canEditSelectedOrder} /></Grid>
                <Grid item xs={12} md={3}><TextField type="number" label="Costo mano de obra" value={taskForm.labor_cost} onChange={(e) => setTaskForm((c) => ({ ...c, labor_cost: e.target.value }))} fullWidth inputProps={{ min: 0, step: "0.01" }} disabled={!canEditSelectedOrder} /></Grid>
                <Grid item xs={12} md={2}><TextField type="number" label="Orden" value={taskForm.execution_order} onChange={(e) => setTaskForm((c) => ({ ...c, execution_order: Number(e.target.value) }))} fullWidth disabled={!canEditSelectedOrder} /></Grid>
                <Grid item xs={12} md={4}><TextField label="Titulo en orden" value={taskForm.title} onChange={(e) => setTaskForm((c) => ({ ...c, title: e.target.value }))} fullWidth disabled={!canEditSelectedOrder} /></Grid>
                <Grid item xs={12} md={4}><TextField label="Sector" value={taskForm.sector} onChange={(e) => setTaskForm((c) => ({ ...c, sector: e.target.value }))} fullWidth disabled={!canEditSelectedOrder} /></Grid>
                <Grid item xs={12} md={3}><Button variant="contained" fullWidth sx={{ height: 40 }} onClick={() => taskMutation.mutate()} disabled={!canEditSelectedOrder || !taskForm.task_template || !taskForm.operator || taskMutation.isPending}>Agregar tarea</Button></Grid>
              </Grid>
              <Table size="small" sx={{ mt: 2 }}>
                <TableHead><TableRow><TableCell>Tarea</TableCell><TableCell>Operario</TableCell><TableCell>Tiempo</TableCell><TableCell>Costo</TableCell><TableCell>Sector</TableCell><TableCell>Estado</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
                <TableBody>{(tasksQuery.data || []).map((task) => <TableRow key={task.id}><TableCell><Typography fontWeight={700}>{task.title}</Typography><Typography variant="caption" color="text.secondary">{task.task_template_name || "Manual"}</Typography></TableCell><TableCell>{task.operator_name || "Sin asignar"}</TableCell><TableCell>{formatMinutes(task.estimated_minutes)}</TableCell><TableCell>{moneyFormatter.format(Number(task.labor_cost || 0))}</TableCell><TableCell>{task.sector || "-"}</TableCell><TableCell>{task.status}</TableCell><TableCell align="right"><Tooltip title="Cerrar tarea terminada"><span><IconButton color="success" disabled={!canEditSelectedOrder || task.status === "completed" || completeTaskMutation.isPending} onClick={() => completeTaskMutation.mutate(task.id)}><CheckCircleIcon /></IconButton></span></Tooltip></TableCell></TableRow>)}</TableBody>
              </Table>
            </Box>

            <Box>
              <Typography variant="h6" gutterBottom>Repuestos</Typography>
              {partMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>{getApiErrorMessage(partMutation.error)}</Alert>}
              <Grid container spacing={2}>
                <Grid item xs={12} md={5}><TextField select label="Repuesto" value={partForm.part} onChange={updatePartSelection} fullWidth disabled={!canEditSelectedOrder}>{partsCatalog.map((part) => <MenuItem key={part.id} value={part.id}>{part.code} - {part.name}</MenuItem>)}</TextField></Grid>
                <Grid item xs={6} md={2}><TextField type="number" label="Cantidad" value={partForm.quantity} onChange={(e) => setPartForm((c) => ({ ...c, quantity: e.target.value }))} fullWidth inputProps={{ min: 0.01, step: "0.01" }} disabled={!canEditSelectedOrder} /></Grid>
                <Grid item xs={6} md={2}><TextField type="number" label="Costo unit." value={partForm.unit_cost} onChange={(e) => setPartForm((c) => ({ ...c, unit_cost: e.target.value }))} fullWidth inputProps={{ min: 0, step: "0.01" }} disabled={!canEditSelectedOrder} /></Grid>
                <Grid item xs={12} md={3}><Button variant="outlined" fullWidth sx={{ height: 40 }} disabled={!canEditSelectedOrder || !partForm.part || partMutation.isPending} onClick={() => partMutation.mutate()}>Agregar repuesto</Button></Grid>
              </Grid>
              <Table size="small" sx={{ mt: 2 }}>
                <TableHead><TableRow><TableCell>Codigo</TableCell><TableCell>Repuesto</TableCell><TableCell>Cantidad</TableCell><TableCell>Total</TableCell></TableRow></TableHead>
                <TableBody>{orderParts.map((item) => <TableRow key={item.id}><TableCell>{item.part_code}</TableCell><TableCell>{item.part_name}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>{moneyFormatter.format(Number(item.total_cost || 0))}</TableCell></TableRow>)}</TableBody>
              </Table>
            </Box>

            <Box>
              <Typography variant="h6" gutterBottom>Materiales</Typography>
              {materialMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>{getApiErrorMessage(materialMutation.error)}</Alert>}
              <Grid container spacing={2}>
                <Grid item xs={12} md={5}><TextField select label="Material" value={materialForm.material} onChange={updateMaterialSelection} fullWidth disabled={!canEditSelectedOrder}>{materialsCatalog.map((material) => <MenuItem key={material.id} value={material.id}>{material.code} - {material.name}</MenuItem>)}</TextField></Grid>
                <Grid item xs={6} md={2}><TextField type="number" label="Cantidad" value={materialForm.quantity} onChange={(e) => setMaterialForm((c) => ({ ...c, quantity: e.target.value }))} fullWidth inputProps={{ min: 0.01, step: "0.01" }} disabled={!canEditSelectedOrder} /></Grid>
                <Grid item xs={6} md={2}><TextField type="number" label="Costo unit." value={materialForm.unit_cost} onChange={(e) => setMaterialForm((c) => ({ ...c, unit_cost: e.target.value }))} fullWidth inputProps={{ min: 0, step: "0.01" }} disabled={!canEditSelectedOrder} /></Grid>
                <Grid item xs={12} md={3}><Button variant="outlined" fullWidth sx={{ height: 40 }} disabled={!canEditSelectedOrder || !materialForm.material || materialMutation.isPending} onClick={() => materialMutation.mutate()}>Agregar material</Button></Grid>
              </Grid>
              <Table size="small" sx={{ mt: 2 }}>
                <TableHead><TableRow><TableCell>Codigo</TableCell><TableCell>Material</TableCell><TableCell>Cantidad</TableCell><TableCell>Total</TableCell></TableRow></TableHead>
                <TableBody>{orderMaterials.map((item) => <TableRow key={item.id}><TableCell>{item.material_code}</TableCell><TableCell>{item.material_name}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>{moneyFormatter.format(Number(item.total_cost || 0))}</TableCell></TableRow>)}</TableBody>
              </Table>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setTaskOrder(null)}>Cerrar</Button></DialogActions>
      </Dialog>

      <ConfirmDialog open={Boolean(deleteTarget)} title="Dar de baja orden" message={`Se dara de baja ${deleteTarget?.order_number || "esta orden"}.`} confirmLabel="Dar de baja" loading={deleteMutation.isPending} onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} />
    </Stack>
  );
}

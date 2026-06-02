import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
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

import { createTask, deleteTask, listTasks, updateTask } from "../../api/tasksApi.js";
import { getApiErrorMessage } from "../../api/errorUtils.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import StatusChip from "../../components/StatusChip.jsx";

const emptyTask = {
  name: "",
  description: "",
  estimated_hours: 1,
  estimated_minutes_part: 0,
  labor_cost: "0.00",
  status: "active",
};

const moneyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

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
  const estimated_minutes = Number(form.estimated_hours || 0) * 60 + Number(form.estimated_minutes_part || 0);
  return {
    name: form.name,
    description: form.description,
    estimated_minutes,
    labor_cost: form.labor_cost,
    status: form.status,
  };
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyTask);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const tasksQuery = useQuery({
    queryKey: ["task-catalog", { page, rowsPerPage, search }],
    queryFn: () =>
      listTasks({
        page: page + 1,
        page_size: rowsPerPage,
        search: search || undefined,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = buildTaskPayload(form);
      return editing ? updateTask(editing.id, payload) : createTask(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-catalog"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-catalog"] });
      setDeleteTarget(null);
    },
  });

  const rows = tasksQuery.data?.results || [];
  const count = tasksQuery.data?.count || 0;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyTask);
    setDialogOpen(true);
  };

  const openEdit = (task) => {
    const duration = splitMinutes(task.estimated_minutes);
    setEditing(task);
    setForm({
      name: task.name || "",
      description: task.description || "",
      estimated_hours: duration.estimated_hours,
      estimated_minutes_part: duration.estimated_minutes_part,
      labor_cost: task.labor_cost || "0.00",
      status: task.status || "active",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyTask);
    saveMutation.reset();
  };

  const updateForm = (field) => (event) => {
    const numericFields = ["estimated_hours", "estimated_minutes_part"];
    setForm((current) => ({ ...current, [field]: numericFields.includes(field) ? Number(event.target.value) : event.target.value }));
  };

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h4">Tareas</Typography>
          <Typography color="text.secondary">
            Catalogo de tareas reutilizables con descripcion y tiempo previsto.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nueva tarea
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TextField
            placeholder="Buscar por nombre o descripcion"
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

          {tasksQuery.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {getApiErrorMessage(tasksQuery.error, "No se pudieron cargar las tareas.")}
            </Alert>
          )}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tarea</TableCell>
                  <TableCell>Descripcion</TableCell>
                  <TableCell>Tiempo previsto</TableCell>
                  <TableCell>Mano de obra</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((task) => (
                  <TableRow key={task.id} hover>
                    <TableCell>
                      <Typography fontWeight={700}>{task.name}</Typography>
                    </TableCell>
                    <TableCell>{task.description || "-"}</TableCell>
                    <TableCell>{formatMinutes(task.estimated_minutes)}</TableCell>
                    <TableCell>{moneyFormatter.format(Number(task.labor_cost || 0))}</TableCell>
                    <TableCell>
                      <StatusChip
                        label={task.status === "active" ? "Activo" : "Inactivo"}
                        color={task.status === "active" ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton onClick={() => openEdit(task)} aria-label="Editar tarea">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Dar de baja">
                        <IconButton color="error" onClick={() => setDeleteTarget(task)} aria-label="Dar de baja tarea">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!tasksQuery.isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary" textAlign="center" py={4}>
                        No hay tareas para mostrar.
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
        <Box component="form" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }}>
          <DialogTitle>{editing ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} pt={1}>
              {saveMutation.isError && (
                <Alert severity="error">
                  {getApiErrorMessage(saveMutation.error, "No se pudo guardar la tarea.")}
                </Alert>
              )}
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <TextField label="Nombre de la tarea" value={form.name} onChange={updateForm("name")} required fullWidth />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    label="Horas"
                    type="number"
                    value={form.estimated_hours}
                    onChange={updateForm("estimated_hours")}
                    required
                    fullWidth
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    label="Minutos"
                    type="number"
                    value={form.estimated_minutes_part}
                    onChange={updateForm("estimated_minutes_part")}
                    required
                    fullWidth
                    inputProps={{ min: 0, max: 59 }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Costo mano de obra"
                    type="number"
                    value={form.labor_cost}
                    onChange={updateForm("labor_cost")}
                    required
                    fullWidth
                    inputProps={{ min: 0, step: "0.01" }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField select label="Estado" value={form.status} onChange={updateForm("status")} fullWidth>
                    <MenuItem value="active">Activo</MenuItem>
                    <MenuItem value="inactive">Inactivo</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Descripcion"
                    value={form.description}
                    onChange={updateForm("description")}
                    fullWidth
                    multiline
                    minRows={3}
                  />
                </Grid>
              </Grid>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} disabled={saveMutation.isPending}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Dar de baja tarea"
        message={`Se dara de baja la tarea ${deleteTarget?.name || "seleccionada"}.`}
        confirmLabel="Dar de baja"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </Stack>
  );
}

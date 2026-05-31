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

import { createOperator, deleteOperator, listOperators, updateOperator } from "../../api/operatorsApi.js";
import { getApiErrorMessage } from "../../api/errorUtils.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import StatusChip from "../../components/StatusChip.jsx";

const taskTypes = [
  ["painter", "Pintor"],
  ["mechanic", "Mecanico"],
  ["bodyworker", "Chapista"],
];

const maritalStatuses = [
  ["single", "Soltero/a"],
  ["married", "Casado/a"],
  ["divorced", "Divorciado/a"],
  ["widowed", "Viudo/a"],
  ["other", "Otro"],
];

const emptyOperator = {
  first_name: "",
  last_name: "",
  dni: "",
  address: "",
  phone: "",
  email: "",
  marital_status: "single",
  task_type: "mechanic",
  status: "active",
};

function labelFrom(options, value) {
  return options.find(([optionValue]) => optionValue === value)?.[1] || value;
}

export default function OperatorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyOperator);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const operatorsQuery = useQuery({
    queryKey: ["operators", { page, rowsPerPage, search }],
    queryFn: () =>
      listOperators({
        page: page + 1,
        page_size: rowsPerPage,
        search: search || undefined,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: () => (editing ? updateOperator(editing.id, form) : createOperator(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteOperator(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      setDeleteTarget(null);
    },
  });

  const rows = operatorsQuery.data?.results || [];
  const count = operatorsQuery.data?.count || 0;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyOperator);
    setDialogOpen(true);
  };

  const openEdit = (operator) => {
    setEditing(operator);
    setForm({
      first_name: operator.first_name || "",
      last_name: operator.last_name || "",
      dni: operator.dni || "",
      address: operator.address || "",
      phone: operator.phone || "",
      email: operator.email || "",
      marital_status: operator.marital_status || "single",
      task_type: operator.task_type || "mechanic",
      status: operator.status || "active",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyOperator);
    saveMutation.reset();
  };

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h4">Operarios</Typography>
          <Typography color="text.secondary">
            Alta, edicion, baja logica y especialidad de trabajo.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nuevo operario
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TextField
            placeholder="Buscar por nombre, DNI, telefono, mail o direccion"
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

          {operatorsQuery.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {getApiErrorMessage(operatorsQuery.error, "No se pudieron cargar los operarios.")}
            </Alert>
          )}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Operario</TableCell>
                  <TableCell>Contacto</TableCell>
                  <TableCell>Direccion</TableCell>
                  <TableCell>Estado civil</TableCell>
                  <TableCell>Tipo de tarea</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((operator) => (
                  <TableRow key={operator.id} hover>
                    <TableCell>
                      <Typography fontWeight={700}>{operator.full_name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        DNI {operator.dni}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{operator.phone}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {operator.email || "Sin mail"}
                      </Typography>
                    </TableCell>
                    <TableCell>{operator.address}</TableCell>
                    <TableCell>{labelFrom(maritalStatuses, operator.marital_status)}</TableCell>
                    <TableCell>{labelFrom(taskTypes, operator.task_type)}</TableCell>
                    <TableCell>
                      <StatusChip
                        label={operator.status === "active" ? "Activo" : "Inactivo"}
                        color={operator.status === "active" ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton onClick={() => openEdit(operator)} aria-label="Editar operario">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Dar de baja">
                        <IconButton color="error" onClick={() => setDeleteTarget(operator)} aria-label="Dar de baja operario">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!operatorsQuery.isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography color="text.secondary" textAlign="center" py={4}>
                        No hay operarios para mostrar.
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
          <DialogTitle>{editing ? "Editar operario" : "Nuevo operario"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} pt={1}>
              {saveMutation.isError && (
                <Alert severity="error">
                  {getApiErrorMessage(saveMutation.error, "No se pudo guardar el operario.")}
                </Alert>
              )}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField label="Nombre" value={form.first_name} onChange={updateForm("first_name")} required fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Apellido" value={form.last_name} onChange={updateForm("last_name")} required fullWidth />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="DNI" value={form.dni} onChange={updateForm("dni")} required fullWidth />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="Telefono" value={form.phone} onChange={updateForm("phone")} required fullWidth />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="Mail" type="email" value={form.email} onChange={updateForm("email")} fullWidth />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Direccion" value={form.address} onChange={updateForm("address")} required fullWidth />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField select label="Estado civil" value={form.marital_status} onChange={updateForm("marital_status")} fullWidth>
                    {maritalStatuses.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField select label="Tipo de tarea" value={form.task_type} onChange={updateForm("task_type")} required fullWidth>
                    {taskTypes.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField select label="Estado" value={form.status} onChange={updateForm("status")} fullWidth>
                    <MenuItem value="active">Activo</MenuItem>
                    <MenuItem value="inactive">Inactivo</MenuItem>
                  </TextField>
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
        title="Dar de baja operario"
        message={`Se dara de baja a ${deleteTarget?.full_name || "este operario"}.`}
        confirmLabel="Dar de baja"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </Stack>
  );
}

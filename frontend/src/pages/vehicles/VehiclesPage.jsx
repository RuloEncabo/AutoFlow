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

import { listClients } from "../../api/clientsApi.js";
import { getApiErrorMessage } from "../../api/errorUtils.js";
import { createVehicle, deleteVehicle, listVehicles, updateVehicle } from "../../api/vehiclesApi.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import StatusChip from "../../components/StatusChip.jsx";

const emptyVehicle = {
  client: "",
  brand: "",
  model: "",
  plate: "",
  year: "",
  color: "",
  vin: "",
  notes: "",
  status: "active",
};

function statusColor(status) {
  return status === "active" ? "success" : "default";
}

function statusLabel(status) {
  return status === "active" ? "Activo" : "Inactivo";
}

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [form, setForm] = useState(emptyVehicle);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const vehiclesQuery = useQuery({
    queryKey: ["vehicles", { page, rowsPerPage, search }],
    queryFn: () =>
      listVehicles({
        page: page + 1,
        page_size: rowsPerPage,
        search: search || undefined,
      }),
  });

  const clientsQuery = useQuery({
    queryKey: ["clients", "options"],
    queryFn: () => listClients({ page_size: 100, ordering: "last_name" }),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        year: form.year ? Number(form.year) : null,
      };
      return editingVehicle
        ? updateVehicle(editingVehicle.id, payload)
        : createVehicle(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDeleteTarget(null);
    },
  });

  const rows = vehiclesQuery.data?.results || [];
  const count = vehiclesQuery.data?.count || 0;
  const clients = clientsQuery.data?.results || [];

  const openCreate = () => {
    setEditingVehicle(null);
    setForm({ ...emptyVehicle, client: clients[0]?.id || "" });
    setDialogOpen(true);
  };

  const openEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setForm({
      client: vehicle.client || "",
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      plate: vehicle.plate || "",
      year: vehicle.year || "",
      color: vehicle.color || "",
      vin: vehicle.vin || "",
      notes: vehicle.notes || "",
      status: vehicle.status || "active",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingVehicle(null);
    setForm(emptyVehicle);
    saveMutation.reset();
  };

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h4">Vehiculos</Typography>
          <Typography color="text.secondary">
            Alta, edicion, busqueda por patente y baja logica de vehiculos.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nuevo vehiculo
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TextField
            placeholder="Buscar por patente, cliente, marca, modelo o VIN"
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

          {vehiclesQuery.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {getApiErrorMessage(vehiclesQuery.error, "No se pudieron cargar los vehiculos.")}
            </Alert>
          )}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Patente</TableCell>
                  <TableCell>Vehiculo</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>VIN</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((vehicle) => (
                  <TableRow key={vehicle.id} hover>
                    <TableCell>
                      <Typography fontWeight={700}>{vehicle.plate}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {vehicle.plate_normalized}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={700}>
                        {vehicle.brand} {vehicle.model}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {[vehicle.year, vehicle.color].filter(Boolean).join(" | ") || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>{vehicle.client_name || "-"}</TableCell>
                    <TableCell>{vehicle.vin || "-"}</TableCell>
                    <TableCell>
                      <StatusChip label={statusLabel(vehicle.status)} color={statusColor(vehicle.status)} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton onClick={() => openEdit(vehicle)} aria-label="Editar vehiculo">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Dar de baja">
                        <IconButton
                          color="error"
                          onClick={() => setDeleteTarget(vehicle)}
                          aria-label="Dar de baja vehiculo"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!vehiclesQuery.isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary" textAlign="center" py={4}>
                        No hay vehiculos para mostrar.
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
          <DialogTitle>{editingVehicle ? "Editar vehiculo" : "Nuevo vehiculo"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} pt={1}>
              {saveMutation.isError && (
                <Alert severity="error">
                  {getApiErrorMessage(saveMutation.error, "No se pudo guardar el vehiculo.")}
                </Alert>
              )}
              {clients.length === 0 && (
                <Alert severity="info">Para crear un vehiculo primero debe existir al menos un cliente.</Alert>
              )}
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Cliente"
                    select
                    value={form.client}
                    onChange={updateForm("client")}
                    required
                    fullWidth
                  >
                    {clients.map((client) => (
                      <MenuItem key={client.id} value={client.id}>
                        {client.full_name} {client.document ? `- ${client.document}` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Marca" value={form.brand} onChange={updateForm("brand")} required fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Modelo" value={form.model} onChange={updateForm("model")} required fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Patente" value={form.plate} onChange={updateForm("plate")} required fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Anio"
                    type="number"
                    value={form.year}
                    onChange={updateForm("year")}
                    inputProps={{ min: 1900, max: 2100 }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Color" value={form.color} onChange={updateForm("color")} fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="VIN / chasis" value={form.vin} onChange={updateForm("vin")} fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Estado" select value={form.status} onChange={updateForm("status")} fullWidth>
                    <MenuItem value="active">Activo</MenuItem>
                    <MenuItem value="inactive">Inactivo</MenuItem>
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Dar de baja vehiculo"
        message={`Se dara de baja el vehiculo ${deleteTarget?.plate || ""}.`}
        confirmLabel="Dar de baja"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </Stack>
  );
}


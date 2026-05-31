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

import { createClient, deleteClient, listClients, updateClient } from "../../api/clientsApi.js";
import { getApiErrorMessage } from "../../api/errorUtils.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import StatusChip from "../../components/StatusChip.jsx";

const emptyClient = {
  first_name: "",
  last_name: "",
  document: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  notes: "",
  status: "active",
};

function statusColor(status) {
  return status === "active" ? "success" : "default";
}

function statusLabel(status) {
  return status === "active" ? "Activo" : "Inactivo";
}

const moneyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(emptyClient);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const clientsQuery = useQuery({
    queryKey: ["clients", { page, rowsPerPage, search }],
    queryFn: () =>
      listClients({
        page: page + 1,
        page_size: rowsPerPage,
        search: search || undefined,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      editingClient ? updateClient(editingClient.id, form) : createClient(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDeleteTarget(null);
    },
  });

  const rows = clientsQuery.data?.results || [];
  const count = clientsQuery.data?.count || 0;

  const openCreate = () => {
    setEditingClient(null);
    setForm(emptyClient);
    setDialogOpen(true);
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setForm({
      first_name: client.first_name || "",
      last_name: client.last_name || "",
      document: client.document || "",
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
      city: client.city || "",
      notes: client.notes || "",
      status: client.status || "active",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingClient(null);
    setForm(emptyClient);
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
          <Typography variant="h4">Clientes</Typography>
          <Typography color="text.secondary">
            Alta, edicion, busqueda y baja logica de clientes.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nuevo cliente
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TextField
            placeholder="Buscar por nombre, documento, telefono, email o ciudad"
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

          {clientsQuery.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {getApiErrorMessage(clientsQuery.error, "No se pudieron cargar los clientes.")}
            </Alert>
          )}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Contacto</TableCell>
                  <TableCell>Ciudad</TableCell>
                  <TableCell>Vehiculos</TableCell>
                  <TableCell>Facturacion</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((client) => (
                  <TableRow key={client.id} hover>
                    <TableCell>
                      <Typography fontWeight={700}>{client.full_name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {client.document || "Sin documento"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{client.phone}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {client.email || "Sin email"}
                      </Typography>
                    </TableCell>
                    <TableCell>{client.city || "-"}</TableCell>
                    <TableCell>{client.vehicles_count || 0}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <StatusChip label={`${client.billing_summary?.paid_count || 0} cobradas`} color="success" />
                        <StatusChip label={`${client.billing_summary?.due_count || 0} adeudadas`} color={(client.billing_summary?.due_count || 0) > 0 ? "error" : "default"} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Deuda: {moneyFormatter.format(Number(client.billing_summary?.due_total || 0))}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip label={statusLabel(client.status)} color={statusColor(client.status)} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton onClick={() => openEdit(client)} aria-label="Editar cliente">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Dar de baja">
                        <IconButton
                          color="error"
                          onClick={() => setDeleteTarget(client)}
                          aria-label="Dar de baja cliente"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!clientsQuery.isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography color="text.secondary" textAlign="center" py={4}>
                        No hay clientes para mostrar.
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
          <DialogTitle>{editingClient ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} pt={1}>
              {saveMutation.isError && (
                <Alert severity="error">
                  {getApiErrorMessage(saveMutation.error, "No se pudo guardar el cliente.")}
                </Alert>
              )}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField label="Nombre" value={form.first_name} onChange={updateForm("first_name")} required fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Apellido" value={form.last_name} onChange={updateForm("last_name")} required fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Documento" value={form.document} onChange={updateForm("document")} fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Telefono" value={form.phone} onChange={updateForm("phone")} required fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Email" type="email" value={form.email} onChange={updateForm("email")} fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Ciudad" value={form.city} onChange={updateForm("city")} fullWidth />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Direccion" value={form.address} onChange={updateForm("address")} fullWidth />
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
            <Button type="submit" variant="contained" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Dar de baja cliente"
        message={`Se dara de baja a ${deleteTarget?.full_name || "este cliente"}.`}
        confirmLabel="Dar de baja"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </Stack>
  );
}

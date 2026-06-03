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

import { createUser, deleteUser, listUsers, updateUser } from "../../api/usersApi.js";
import { getApiErrorMessage } from "../../api/errorUtils.js";
import { ROLES, roleLabels } from "../../auth/roles.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import StatusChip from "../../components/StatusChip.jsx";

const roleOptions = [
  [ROLES.ADMIN, roleLabels[ROLES.ADMIN]],
  [ROLES.OPERATIVE, roleLabels[ROLES.OPERATIVE]],
  [ROLES.ADMINISTRATION, roleLabels[ROLES.ADMINISTRATION]],
];

const emptyUser = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  role: ROLES.OPERATIVE,
  is_active: true,
  password: "",
};

function buildPayload(form, editing) {
  const payload = {
    email: form.email,
    first_name: form.first_name,
    last_name: form.last_name,
    phone: form.phone,
    role: form.role,
    is_active: form.is_active,
  };
  if (!editing || form.password) {
    payload.password = form.password;
  }
  return payload;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyUser);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const usersQuery = useQuery({
    queryKey: ["users", { page, rowsPerPage, search }],
    queryFn: () => listUsers({ page: page + 1, page_size: rowsPerPage, search: search || undefined }),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload(form, editing);
      return editing ? updateUser(editing.id, payload) : createUser(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteTarget(null);
    },
  });

  const rows = usersQuery.data?.results || [];
  const count = usersQuery.data?.count || 0;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyUser);
    setDialogOpen(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      email: user.email || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone: user.phone || "",
      role: user.role || ROLES.OPERATIVE,
      is_active: Boolean(user.is_active),
      password: "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyUser);
    saveMutation.reset();
  };

  const updateForm = (field) => (event) => {
    const value = field === "is_active" ? event.target.value === "true" : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h4">Usuarios</Typography>
          <Typography color="text.secondary">Alta, baja y modificacion de usuarios y perfiles de acceso.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Nuevo usuario</Button>
      </Box>

      <Card>
        <CardContent>
          <TextField
            placeholder="Buscar por email, nombre, apellido o telefono"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            fullWidth
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ mb: 2 }}
          />

          {usersQuery.isError && <Alert severity="error" sx={{ mb: 2 }}>{getApiErrorMessage(usersQuery.error, "No se pudieron cargar los usuarios.")}</Alert>}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Perfil</TableCell>
                  <TableCell>Telefono</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Ultimo acceso</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography fontWeight={700}>{user.full_name || user.email}</Typography>
                      <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                    </TableCell>
                    <TableCell>{roleLabels[user.role] || user.role}</TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
                    <TableCell><StatusChip label={user.is_active ? "Activo" : "Inactivo"} color={user.is_active ? "success" : "default"} /></TableCell>
                    <TableCell>{user.last_login ? new Date(user.last_login).toLocaleString("es-AR") : "-"}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar"><IconButton onClick={() => openEdit(user)}><EditIcon /></IconButton></Tooltip>
                      <Tooltip title="Dar de baja"><IconButton color="error" onClick={() => setDeleteTarget(user)}><DeleteIcon /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!usersQuery.isLoading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={6}><Typography color="text.secondary" textAlign="center" py={4}>No hay usuarios para mostrar.</Typography></TableCell></TableRow>
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
          <DialogTitle>{editing ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} pt={1}>
              {saveMutation.isError && <Alert severity="error">{getApiErrorMessage(saveMutation.error, "No se pudo guardar el usuario.")}</Alert>}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><TextField label="Email" type="email" value={form.email} onChange={updateForm("email")} required fullWidth /></Grid>
                <Grid item xs={12} md={6}><TextField label={editing ? "Nueva contrasena" : "Contrasena"} type="password" value={form.password} onChange={updateForm("password")} required={!editing} fullWidth helperText={editing ? "Dejar vacio para conservar la actual." : "Minimo 6 caracteres."} /></Grid>
                <Grid item xs={12} md={6}><TextField label="Nombre" value={form.first_name} onChange={updateForm("first_name")} fullWidth /></Grid>
                <Grid item xs={12} md={6}><TextField label="Apellido" value={form.last_name} onChange={updateForm("last_name")} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="Telefono" value={form.phone} onChange={updateForm("phone")} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField select label="Perfil" value={form.role} onChange={updateForm("role")} fullWidth>{roleOptions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField></Grid>
                <Grid item xs={12} md={4}><TextField select label="Estado" value={String(form.is_active)} onChange={updateForm("is_active")} fullWidth><MenuItem value="true">Activo</MenuItem><MenuItem value="false">Inactivo</MenuItem></TextField></Grid>
              </Grid>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} disabled={saveMutation.isPending}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Guardando..." : "Guardar"}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Dar de baja usuario"
        message={`Se desactivara el usuario ${deleteTarget?.email || "seleccionado"}.`}
        confirmLabel="Dar de baja"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </Stack>
  );
}

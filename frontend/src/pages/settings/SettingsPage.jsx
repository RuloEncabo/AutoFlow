import SaveIcon from "@mui/icons-material/Save";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "../../api/errorUtils.js";
import { getWorkshopProfile, updateWorkshopProfile } from "../../api/settingsApi.js";

const emptyForm = {
  name: "",
  address: "",
  phone: "",
  whatsapp: "",
  email: "",
  order_header_title: "Orden de trabajo",
  estimate_header_title: "Presupuesto",
  invoice_header_title: "Factura",
  document_footer: "",
  logoFile: null,
};

export default function SettingsPage() {
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState(null);
  const profileQuery = useQuery({ queryKey: ["workshop-profile"], queryFn: getWorkshopProfile });

  useEffect(() => {
    if (!profileQuery.data) return;
    setForm((current) => ({
      ...current,
      name: profileQuery.data.name || "",
      address: profileQuery.data.address || "",
      phone: profileQuery.data.phone || "",
      whatsapp: profileQuery.data.whatsapp || "",
      email: profileQuery.data.email || "",
      order_header_title: profileQuery.data.order_header_title || "Orden de trabajo",
      estimate_header_title: profileQuery.data.estimate_header_title || "Presupuesto",
      invoice_header_title: profileQuery.data.invoice_header_title || "Factura",
      document_footer: profileQuery.data.document_footer || "",
      logoFile: null,
    }));
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => updateWorkshopProfile(form),
    onSuccess: (data) => {
      profileQuery.refetch();
      setToast({ severity: "success", message: "Cabecera actualizada correctamente." });
      setForm((current) => ({ ...current, logoFile: null }));
      return data;
    },
    onError: (error) => setToast({ severity: "error", message: getApiErrorMessage(error) }),
  });

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Configuracion</Typography>
        <Typography color="text.secondary">
          Cabecera para ordenes, presupuestos y facturas PDF.
        </Typography>
      </Box>
      {toast && <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.message}</Alert>}
      {profileQuery.isError && <Alert severity="error">{getApiErrorMessage(profileQuery.error)}</Alert>}

      <Card>
        <CardContent>
          <Box component="form" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Stack spacing={2} alignItems="flex-start">
                  <Avatar
                    variant="rounded"
                    src={form.logoFile ? URL.createObjectURL(form.logoFile) : profileQuery.data?.logo_url}
                    sx={{ width: 160, height: 96, bgcolor: "grey.100", border: "1px solid", borderColor: "divider" }}
                  >
                    Logo
                  </Avatar>
                  <Button variant="outlined" component="label">
                    Cambiar logo
                    <input
                      hidden
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => setForm((current) => ({ ...current, logoFile: event.target.files?.[0] || null }))}
                    />
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    El logo se usara en la cabecera de todos los PDF comerciales.
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} md={8}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField label="Nombre del taller" value={form.name} onChange={update("name")} fullWidth required />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Email" value={form.email} onChange={update("email")} fullWidth />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Direccion" value={form.address} onChange={update("address")} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Telefono" value={form.phone} onChange={update("phone")} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="WhatsApp" value={form.whatsapp} onChange={update("whatsapp")} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField label="Titulo orden" value={form.order_header_title} onChange={update("order_header_title")} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField label="Titulo presupuesto" value={form.estimate_header_title} onChange={update("estimate_header_title")} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField label="Titulo factura" value={form.invoice_header_title} onChange={update("invoice_header_title")} fullWidth />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Pie de documento" value={form.document_footer} onChange={update("document_footer")} fullWidth multiline minRows={3} />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end">
                  <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saveMutation.isPending}>
                    Guardar configuracion
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}

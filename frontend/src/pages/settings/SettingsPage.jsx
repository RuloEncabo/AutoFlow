import SaveIcon from "@mui/icons-material/Save";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "../../api/errorUtils.js";
import { getWorkshopProfile, sendSettingsTestEmail, updateWorkshopProfile } from "../../api/settingsApi.js";

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
  email_service_enabled: true,
  email_from_name: "",
  email_from_address: "",
  smtp_host: "",
  smtp_port: 587,
  smtp_username: "",
  smtp_password: "",
  smtp_use_tls: true,
  smtp_use_ssl: false,
  clear_smtp_password: false,
  password_reset_enabled: true,
  password_reset_token_minutes: 60,
  password_reset_frontend_url: "",
  mobile_api_enabled: true,
  mobile_default_api_url: "",
  mobile_photo_upload_enabled: true,
  mobile_require_damage_photo: false,
  mobile_max_photo_mb: 8,
  mobile_offline_sync_enabled: true,
  logoFile: null,
};

export default function SettingsPage() {
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState(null);
  const [testRecipient, setTestRecipient] = useState("");
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
      email_service_enabled: Boolean(profileQuery.data.email_service_enabled),
      email_from_name: profileQuery.data.email_from_name || "",
      email_from_address: profileQuery.data.email_from_address || "",
      smtp_host: profileQuery.data.smtp_host || "",
      smtp_port: profileQuery.data.smtp_port || 587,
      smtp_username: profileQuery.data.smtp_username || "",
      smtp_password: "",
      smtp_use_tls: Boolean(profileQuery.data.smtp_use_tls),
      smtp_use_ssl: Boolean(profileQuery.data.smtp_use_ssl),
      clear_smtp_password: false,
      password_reset_enabled: Boolean(profileQuery.data.password_reset_enabled),
      password_reset_token_minutes: profileQuery.data.password_reset_token_minutes || 60,
      password_reset_frontend_url: profileQuery.data.password_reset_frontend_url || "",
      mobile_api_enabled: Boolean(profileQuery.data.mobile_api_enabled),
      mobile_default_api_url: profileQuery.data.mobile_default_api_url || "",
      mobile_photo_upload_enabled: Boolean(profileQuery.data.mobile_photo_upload_enabled),
      mobile_require_damage_photo: Boolean(profileQuery.data.mobile_require_damage_photo),
      mobile_max_photo_mb: profileQuery.data.mobile_max_photo_mb || 8,
      mobile_offline_sync_enabled: Boolean(profileQuery.data.mobile_offline_sync_enabled),
      logoFile: null,
    }));
    setTestRecipient(profileQuery.data.email_from_address || profileQuery.data.email || "");
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

  const testEmailMutation = useMutation({
    mutationFn: () => sendSettingsTestEmail(testRecipient),
    onSuccess: () => setToast({ severity: "success", message: "Correo de prueba enviado correctamente." }),
    onError: (error) => setToast({ severity: "error", message: getApiErrorMessage(error, "No se pudo enviar el correo de prueba.") }),
  });

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const updateChecked = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.checked }));
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Configuracion</Typography>
        <Typography color="text.secondary">
          Cabecera PDF, email y recuperacion de contrasena.
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
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="h6">Email y recuperacion</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Estos parametros se usan para enviar correos de recuperacion de contrasena.
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={<Checkbox checked={form.email_service_enabled} onChange={updateChecked("email_service_enabled")} />}
                      label="Habilitar envio de emails"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={<Checkbox checked={form.password_reset_enabled} onChange={updateChecked("password_reset_enabled")} />}
                      label="Habilitar recuperacion de contrasena"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Nombre remitente" value={form.email_from_name} onChange={update("email_from_name")} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Email remitente" type="email" value={form.email_from_address} onChange={update("email_from_address")} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField label="Servidor SMTP" value={form.smtp_host} onChange={update("smtp_host")} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField label="Puerto" type="number" value={form.smtp_port} onChange={update("smtp_port")} fullWidth inputProps={{ min: 1 }} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField label="Usuario SMTP" value={form.smtp_username} onChange={update("smtp_username")} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Clave SMTP"
                      type="password"
                      value={form.smtp_password}
                      onChange={update("smtp_password")}
                      placeholder={profileQuery.data?.smtp_password_configured ? "Clave configurada" : ""}
                      helperText="Dejar vacio para conservar la clave actual."
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={0.5}>
                      <FormControlLabel
                        control={<Checkbox checked={form.smtp_use_tls} onChange={updateChecked("smtp_use_tls")} />}
                        label="Usar TLS"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={form.smtp_use_ssl} onChange={updateChecked("smtp_use_ssl")} />}
                        label="Usar SSL"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={form.clear_smtp_password} onChange={updateChecked("clear_smtp_password")} />}
                        label="Borrar clave SMTP guardada"
                      />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Vencimiento enlace (minutos)"
                      type="number"
                      value={form.password_reset_token_minutes}
                      onChange={update("password_reset_token_minutes")}
                      fullWidth
                      inputProps={{ min: 5 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="URL reset frontend"
                      value={form.password_reset_frontend_url}
                      onChange={update("password_reset_frontend_url")}
                      fullWidth
                      helperText="Ejemplo: https://tu-front/reset-password"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
                      <TextField
                        label="Email de prueba"
                        type="email"
                        value={testRecipient}
                        onChange={(event) => setTestRecipient(event.target.value)}
                        fullWidth
                      />
                      <Button
                        variant="outlined"
                        onClick={() => testEmailMutation.mutate()}
                        disabled={!testRecipient || testEmailMutation.isPending}
                        sx={{ minWidth: 170 }}
                      >
                        Enviar prueba
                      </Button>
                    </Stack>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="h6">APK y sincronizacion movil</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Estos parametros permiten que lo cargado desde el telefono se sincronice con la aplicacion web.
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={<Checkbox checked={form.mobile_api_enabled} onChange={updateChecked("mobile_api_enabled")} />}
                      label="Habilitar API movil"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={<Checkbox checked={form.mobile_photo_upload_enabled} onChange={updateChecked("mobile_photo_upload_enabled")} />}
                      label="Permitir fotos desde APK"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={<Checkbox checked={form.mobile_offline_sync_enabled} onChange={updateChecked("mobile_offline_sync_enabled")} />}
                      label="Permitir sincronizacion offline"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={<Checkbox checked={form.mobile_require_damage_photo} onChange={updateChecked("mobile_require_damage_photo")} />}
                      label="Foto obligatoria en danos"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Tamano max foto (MB)"
                      type="number"
                      value={form.mobile_max_photo_mb}
                      onChange={update("mobile_max_photo_mb")}
                      fullWidth
                      inputProps={{ min: 1, max: 30 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <TextField
                      label="URL API para APK"
                      value={form.mobile_default_api_url}
                      onChange={update("mobile_default_api_url")}
                      fullWidth
                      helperText="Ejemplo: https://autoflow-jl6p.onrender.com/api"
                    />
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

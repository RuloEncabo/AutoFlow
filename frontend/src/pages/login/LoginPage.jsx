import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import LogoMark from "../../components/LogoMark.jsx";
import { login } from "../../auth/authSlice.js";

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, status, error } = useSelector((state) => state.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (accessToken) {
      navigate(from, { replace: true });
    }
  }, [accessToken, from, navigate]);

  if (accessToken) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      navigate(from, { replace: true });
    }
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={2}
      sx={{
        backgroundImage:
          "linear-gradient(195deg, rgba(25,25,25,0.64), rgba(52,71,103,0.58)), url('/assets/bg-sign-in-basic.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 420 }}>
        <Box
          mx={2}
          mt={-3}
          p={2.5}
          borderRadius={2}
          textAlign="center"
          color="white"
          sx={{
            background: "linear-gradient(195deg, #3D9DD9, #007CB7)",
            boxShadow: "0px 4px 18px 0px rgba(47, 43, 61, 0.1)",
          }}
        >
          <Stack alignItems="center" spacing={1}>
            <LogoMark compact />
            <Typography variant="h4" color="white">
              Iniciar sesion
            </Typography>
          </Stack>
        </Box>
        <CardContent sx={{ p: 3 }}>
          <Stack component="form" spacing={2.25} onSubmit={handleSubmit}>
            <Typography color="text.secondary" textAlign="center">
              Acceso seguro a la plataforma AutoFlow.
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              fullWidth
            />
            <TextField
              label="Contrasena"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="Mostrar u ocultar contrasena"
                      onClick={() => setShowPassword((value) => !value)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={status === "loading"}
              fullWidth
            >
              {status === "loading" ? "Ingresando..." : "Ingresar"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

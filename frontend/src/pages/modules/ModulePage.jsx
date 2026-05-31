import AddIcon from "@mui/icons-material/Add";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  Card,
  CardContent,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import StatusChip from "../../components/StatusChip.jsx";

export default function ModulePage({ title, description }) {
  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h4">{title}</Typography>
          <Typography color="text.secondary">{description}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}>
          Nuevo
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={2}>
            <TextField
              placeholder="Buscar"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="outlined" startIcon={<FilterAltIcon />} sx={{ minWidth: 128 }}>
              Filtros
            </Button>
          </Stack>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Registro</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Actualizado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Typography fontWeight={700}>Modulo preparado</Typography>
                    <Typography variant="body2" color="text.secondary">
                      La tabla queda lista para conectar al endpoint REST.
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip label="Base UI" color="primary" />
                  </TableCell>
                  <TableCell>Ahora</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Stack>
  );
}


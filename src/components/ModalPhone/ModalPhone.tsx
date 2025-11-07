import { useState } from "react";
import { Box, Button, Typography, TextField, Modal } from "@mui/material";

interface ModalPhoneCentralProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (phone: string) => void;
}

export default function ModalPhoneCentral({
  open,
  onClose,
  onConfirm,
}: ModalPhoneCentralProps) {
  const [phone, setPhone] = useState("");

  const handleConfirm = () => {
    const somenteNumeros = phone.replace(/\D/g, "");

    if (somenteNumeros.length < 10 || somenteNumeros.length > 11) {
      alert("Digite um número de telefone válido!");
      return;
    }

    onConfirm?.(phone);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      closeAfterTransition
      sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <Box
        sx={{
          width: 300,
          bgcolor: "var(--background-accent)",
          borderRadius: 2,
          p: 4,
          boxShadow: 24,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Typography
          id="modal-title"
          variant="h6"
          component="h2"
          textAlign="center"
          color="var(--color-text-primary)"
        >
          Confirme seu telefone
        </Typography>

        <TextField
          type="tel"
          label="Telefone"
          placeholder="(99) 99999-9999"
          value={phone}
          sx={{
            backgroundColor: "white", // fundo branco
            borderRadius: 1, // borda arredondada
            "& .MuiOutlinedInput-root": {
              backgroundColor: "white", // garante que o input interno também fique branco
            },
          }}
          onChange={(e) => setPhone(e.target.value)}
          fullWidth
        />

        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <Button variant="outlined" onClick={onClose} sx={{ flex: 1 }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleConfirm} sx={{ flex: 1 }}>
            Confirmar
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

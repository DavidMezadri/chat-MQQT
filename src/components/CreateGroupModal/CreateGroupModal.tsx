import { useState } from "react";
import { Box, Button, Typography, TextField, Modal } from "@mui/material";

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (groupName: string) => void;
}

export default function CreateGroupModal({
  open,
  onClose,
  onCreate,
}: CreateGroupModalProps) {
  const [name, setName] = useState("");

  const handleSave = () => {
    if (!name.trim()) {
      alert("Digite um nome válido para o grupo!");
      return;
    }

    onCreate(name);
    setName("");
    onClose();
  };

  const handleCancel = () => {
    setName("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      closeAfterTransition
      sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <Box
        sx={{
          width: 320,
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
          Criar novo grupo
        </Typography>

        <TextField
          label="Nome do grupo"
          placeholder="Ex: Amigos, Trabalho, Estudo..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          sx={{
            backgroundColor: "white",
            borderRadius: 1,
            "& .MuiOutlinedInput-root": {
              backgroundColor: "white",
            },
          }}
        />

        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <Button variant="outlined" onClick={handleCancel} sx={{ flex: 1 }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSave} sx={{ flex: 1 }}>
            Salvar
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

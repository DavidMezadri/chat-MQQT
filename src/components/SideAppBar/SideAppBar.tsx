import { Drawer, Popover } from "@mui/material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import "./../../App.css";
import type { NewChatService } from "../../service/NewChatService";
import { formatPhoneBR } from "../../utils/formatDate";
import ModalPhoneCentral from "../ModalPhone/ModalPhone";

interface SideAppBarProps {
  open: boolean;
  buttons: string[];
  onSelect: (id: string) => void;
  newChatService: NewChatService | undefined;
}

export default function SideAppBar({
  open,
  buttons,
  onSelect,
  newChatService,
}: SideAppBarProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [popoverTelephoneOpen, setPopoverTelephoneOpen] = useState(false);

  const handleOpenPopover = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };
  const openPopover = Boolean(anchorEl);

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: 220,
        "& .MuiDrawer-paper": {
          // Paper como container flex vertical
          display: "flex",
          flexDirection: "column",
          width: 220,
          top: 80,
          left: open ? 0 : -220,
          // Garantir que a altura respeite o top: 80 e ocupe o resto da viewport
          height: "calc(100vh - 80px)",
          backgroundColor: "var(--background-accent)",
          color: "white",
          boxSizing: "border-box",
          borderRadius: "0px 10px 0 0",
          transition: "left 0.3s ease",
        },
      }}
    >
      {/* Conteúdo rolável: ocupa todo o espaço disponível exceto o footer */}
      <Box
        sx={{
          flex: 1, // ocupa o espaço restante
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Cabeçalho fixo dentro do conteúdo rolável */}
        <Box sx={{ alignItems: "center", p: 2 }}>
          <Typography variant="h5" sx={{ textAlign: "center" }}>
            Conversas
          </Typography>
        </Box>

        {/* Lista de botões/itens (essa área rola se necessário) */}
        <Box sx={{ display: "flex", flexDirection: "column", p: 2, gap: 1 }}>
          {buttons.map((id) => (
            <Button
              key={id}
              sx={{
                backgroundColor: "var(--color-button-bg)",
                boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.3)",
                color: "inherit",
                justifyContent: "center",
              }}
              onClick={() => onSelect(id)}
            >
              {formatPhoneBR(id)}
            </Button>
          ))}
        </Box>
      </Box>

      {/* Footer fixo: sempre no final do Drawer e nunca menor que 40px */}
      <Box
        sx={{
          // Não participa do scroll (fica fora do flex:1)
          flex: "0 0 auto",
          minHeight: "40px",
          height: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 1,
        }}
      >
        <Button
          onClick={handleOpenPopover}
          sx={{
            fontSize: { xs: "24px", sm: "32px", md: "40px" }, // escala em telas pequenas
            borderRadius: "50%",
            minWidth: "40px",
            width: "60px",
            height: "60px",
            backgroundColor: "var(--color-button-bg)",
            color: "white",
            boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
            "&:hover": {
              backgroundColor: "var(--background-color-hover, #444)",
            },
          }}
        >
          +
        </Button>

        <Popover
          open={openPopover}
          anchorEl={anchorEl}
          onClose={handleClosePopover}
          anchorOrigin={{
            vertical: "top",
            horizontal: "center",
          }}
          transformOrigin={{
            vertical: "bottom",
            horizontal: "center",
          }}
          slotProps={{
            paper: {
              sx: {
                backgroundColor: "var(--background-color)",
                color: "white",
                p: 1,
                borderRadius: 2,
                boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.4)",
              },
            },
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Button
              sx={{
                color: "white",
                justifyContent: "flex-start",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
              }}
              onClick={() => {
                handleClosePopover();
                setPopoverTelephoneOpen(true);
              }}
            >
              Nova conversa
            </Button>

            <Button
              sx={
                {
                  color: "white",
                  justifyContent: "flex-start",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                }}
              onClick={() => {
                handleClosePopover();
                alert("Novo grupo clicado");
              }}
            >
              Novo grupo
            </Button>
          </Box>
        </Popover>
      </Box>
      {popoverTelephoneOpen && (
        <ModalPhoneCentral
          open={popoverTelephoneOpen}
          onClose={() => setPopoverTelephoneOpen(false)}
          onConfirm={(targetUserId) => newChatService?.sendInvite(targetUserId, newChatService.getUserId())}
        />
      )}
    </Drawer>
  );
}

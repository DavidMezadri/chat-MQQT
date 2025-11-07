import React from "react";
import { Box, Typography } from "@mui/material";
import type { Message, TypeConversation } from "../../Menu/Conversations";

// Componente que renderiza uma mensagem individual
const MessageItem: React.FC<Message> = ({ TimeStamp, text, author }) => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: author == "Você" ? "flex-end" : "flex-start",
        mb: 1,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          bgcolor: author == "Você" ? "#1976d2" : "#e0e0e0",
          color: author == "Você" ? "white" : "black",
          p: 1,
          borderRadius: 2,
          maxWidth: "70%",
          wordBreak: "break-word",
        }}
      >
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="body2" fontWeight="bold">
            {author}:
          </Typography>
          <Typography variant="body1">{text}</Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{ alignSelf: "flex-end", mt: 0.5, fontSize: "0.6rem" }}
        >
          {new Date(TimeStamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Typography>
      </Box>
    </Box>
  );
};

export const ChatWindow: React.FC<{
  messages: TypeConversation;
  sx: object;
}> = ({ messages, sx }) => {
  return (
    <Box
      sx={{
        width: "80vw", // largura fixa ou percentual
        height: "80vh", // altura fixa ou percentual
        borderRadius: 1,
        bgcolor: "var(--background-color)",
        border: "1px solid #ccc",
        padding: 2,
        overflowY: "scroll",

        // centralizando
        position: "sticky",
        margin: "auto",
        ...sx,
      }}
    >
      <Typography
        variant="h5"
        sx={{ mb: 1, textAlign: "center", width: "100%" }}
      >
        {messages.name}
      </Typography>

      {messages.Messages?.filter((msg) => (msg.text ?? "").trim() !== "").map(
        (msg, idx) => (
          <MessageItem
            key={idx}
            author={msg.author}
            TimeStamp={msg.TimeStamp}
            text={msg.text}
          />
        )
      )}
    </Box>
  );
};

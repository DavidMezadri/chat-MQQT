import React, { useContext } from "react";
import { ChatContext } from "../../../context/ChatContext";
import { Message } from "../Message/Message";
import { Box } from "@mui/material";
import "./../../../index.css";

export const ChatWindow: React.FC = () => {
  const { messages } = useContext(ChatContext);

  return (
    <>
      <Box
        sx={{
          width: "20vw",
          height: "20vh",
          borderRadius: 1,
          bgcolor: "var(--background-color)",
          border: "1px solid #ccc",
          padding: 8,
          overflowY: "scroll",
        }}
      >
        {" "}
        {messages.map((msg, idx) => (
          <Message
            key={idx}
            author={msg.author}
            text={msg.text}
            timestamp={msg.timestamp}
          />
        ))}
      </Box>
    </>
  );
};

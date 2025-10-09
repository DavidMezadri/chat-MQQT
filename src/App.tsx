import React from "react";
import { ChatProvider } from "./context/ChatContext";
import { ChatWindow } from "./features/chat/ChatWindown/ChatWindown";
import { ChatInput } from "./features/chat/ChatInput/ChatInput";
import Conversations from "./features/Menu/Conversations";

export const App: React.FC = () => {
  return (
    <ChatProvider>
      <Conversations />
      <div style={{ maxWidth: 500, margin: "0 auto", padding: 16 }}>
        <h2>React Chat</h2>
        <ChatWindow />
        <ChatInput />
      </div>
    </ChatProvider>
  );
};

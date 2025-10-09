import React from "react";

interface MessageProps {
  author: string;
  text: string;
  timestamp: string;
}

export const Message: React.FC<MessageProps> = ({
  author,
  text,
  timestamp,
}) => {
  return (
    <div
      style={{
        marginBottom: 8,
        textAlign: author == "Voce" ? "left" : "right",
      }}
    >
      <strong>{author}</strong> <em>{timestamp}</em>
      <em>{" " + text}</em>
    </div>
  );
};

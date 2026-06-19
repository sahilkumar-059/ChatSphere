import { useState } from "react";
import MessageBubble from "./MessageBubble";

export default function ChatWindow() {
  const [input, setInput] = useState("");

  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Bro meeting kab hai?",
      own: false,
    },
    {
      id: 2,
      text: "11 baje start hogi",
      own: true,
    },
    {
      id: 3,
      text: "Perfect 👍",
      own: false,
    },
  ]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const newMessage = {
      id: Date.now(),
      text: input,
      own: true,
    };

    setMessages((prev) => [
      ...prev,
      newMessage,
    ]);

    setInput("");
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        🟢 Aman
      </div>

      <div className="messages">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            text={message.text}
            own={message.own}
          />
        ))}
      </div>

      <div className="input-area">
        <input
          type="text"
          placeholder="Type message..."
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
        />

        <button
  onClick={() => {
    alert("BUTTON WORKING");
    sendMessage();
  }}
>
  Send
</button>
      </div>
    </div>
  );
}
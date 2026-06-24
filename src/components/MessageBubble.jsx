export default function MessageBubble({ message, isOwn }) {
  const statusLabel =
    message.status === "seen"
      ? "✓✓ Seen"
      : message.status === "delivered"
        ? "✓✓ Delivered"
        : "✓ Sent";

  return (
    <div className={`message-bubble ${isOwn ? "sent" : "received"}`}>
      {message.type === "image" ? (
        <>
          <img
            className="message-image"
            src={message.imageUrl}
            alt={message.text || "Shared image"}
          />
          {message.text ? <p>{message.text}</p> : null}
        </>
      ) : null}

      {message.type === "audio" ? (
        <div className="audio-message">
          <audio controls src={message.audioUrl} />
          {message.text ? <p>{message.text}</p> : null}
        </div>
      ) : null}

      {message.type === "text" || !message.type ? <p>{message.text}</p> : null}

      <div className="message-meta">
        <span>{message.timeLabel}</span>
        {isOwn ? <span className={`message-status ${message.status || "sent"}`}>{statusLabel}</span> : null}
      </div>
    </div>
  );
}
export default function MessageBubble({ text, own }) {
  return (
    <div
      className={
        own
          ? "message sent"
          : "message received"
      }
    >
      {text}
    </div>
  );
}
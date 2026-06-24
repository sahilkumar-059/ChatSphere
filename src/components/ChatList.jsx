export default function ChatList({
  chats,
  searchChats,
  onSearchChats,
  selectedChatId,
  onSelectChat,
}) {
  return (
    <section className="chat-list-shell">
      <div className="chat-list-header">
        <div>
          <p className="eyebrow">Conversations</p>
          <h2>Chat List</h2>
        </div>

        <input
          className="search-input"
          type="text"
          placeholder="Search chats"
          value={searchChats}
          onChange={(event) => onSearchChats(event.target.value)}
        />
      </div>

      <div className="chat-list-items">
        {chats.map((chat) => (
          <button
            key={chat.id}
            className={`chat-row ${selectedChatId === chat.id ? "active" : ""}`}
            onClick={() => onSelectChat(chat.id)}
          >
            <div className="chat-avatar" style={{ background: chat.color }}>
              {chat.avatar}
              <span className={`presence-dot ${chat.online ? "online" : "offline"}`} />
            </div>

            <div className="chat-row-body">
              <div className="chat-row-top">
                <strong>{chat.name}</strong>
                <span>{chat.timeLabel}</span>
              </div>

              <div className="chat-row-bottom">
                <p>{chat.lastMessagePreview}</p>
                {chat.unreadCount > 0 ? <span className="unread-pill">{chat.unreadCount}</span> : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
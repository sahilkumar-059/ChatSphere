import { useEffect, useState } from "react";
import { addDoc, collection, onSnapshot } from "firebase/firestore";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, db, provider } from "./firebase";
import "./App.css";

function App() {
  const chats = [
    {
      name: "Aman",
      message: "Bro meeting kab hai?",
      time: "10:45 AM",
      online: true,
      unread: 2,
    },
    {
      name: "Priya",
      message: "Call me when free",
      time: "09:20 AM",
      online: false,
      unread: 0,
    },
    {
      name: "Rohit",
      message: "Project push kar diya",
      time: "Yesterday",
      online: true,
      unread: 5,
    },
  ];

  const [selectedChat, setSelectedChat] = useState("Aman");
  const [search, setSearch] = useState("");
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [firebaseMessages, setFirebaseMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettingsPage, setShowSettingsPage] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [allChats, setAllChats] = useState({
    Aman: [
      {
        sender: "Aman",
        text: "Bro meeting kab hai?",
        type: "received",
        time: "10:40 PM",
      },
      {
        sender: "Me",
        text: "11 baje start hogi",
        type: "sent",
        time: "10:40 PM",
        seen: true,
      },
      {
        sender: "Aman",
        text: "Perfect 👍",
        type: "received",
        time: "10:40 PM",
      },
    ],
    Priya: [
      {
        sender: "Priya",
        text: "Call me when free",
        type: "received",
        time: "10:40 PM",
      },
      {
        sender: "Me",
        text: "Sure 👍",
        type: "sent",
        time: "10:40 PM",
      },
    ],
    Rohit: [
      {
        sender: "Rohit",
        text: "Project push kar diya",
        type: "received",
        time: "10:40 PM",
      },
      {
        sender: "Me",
        text: "Great work 🔥",
        type: "sent",
        time: "10:40 PM",
      },
    ],
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "messages"), (snapshot) => {
      setFirebaseMessages(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    alert("Button Clicked");

    try {
      const result = await signInWithPopup(auth, provider);
      alert("Login Success");
      setUser(result.user);
    } catch (error) {
      alert(error.message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      alert("Logged Out");
    } catch (error) {
      console.log(error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage = {
      sender: "Me",
      text: input,
      type: "sent",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    try {
      await addDoc(collection(db, "messages"), {
        sender: "Me",
        text: input,
        chat: selectedChat,
        time: new Date().toLocaleTimeString(),
      });

      console.log("Message Saved");
    } catch (error) {
      console.error(error);
    }

    setAllChats((prev) => ({
      ...prev,
      [selectedChat]: [...prev[selectedChat], newMessage],
    }));

    setInput("");
    setTyping(true);

    setTimeout(() => {
      const autoReply = {
        sender: selectedChat,
        text: "Got your message 👍",
        type: "received",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setAllChats((prev) => ({
        ...prev,
        [selectedChat]: [...prev[selectedChat], autoReply],
      }));
    }, 2000);

    setTimeout(() => {
      const reply = {
        sender: selectedChat,
        text: "Okay 👍",
        type: "received",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setAllChats((prev) => ({
        ...prev,
        [selectedChat]: [...prev[selectedChat], reply],
      }));

      setTyping(false);
    }, 2000);
  };

  return (
    <div className={`app ${darkMode ? "dark" : "light"}`}>
      <div className="sidebar">
        <h2>ChatSphere</h2>
        <button onClick={login}>Login With Google</button>

        {user && (
          <div>
            <img src={user.photoURL} alt="" width="60" />
            <h4>{user.displayName}</h4>
          </div>
        )}

        <button>💬 Chats</button>
        <button>👥 Friends</button>
        <button>📞 Calls</button>
        <button>⚙️ Settings</button>
      </div>

      <div className="chat-list">
        <div className="search">
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {chats
          .filter((chat) => chat.name.toLowerCase().includes(search.toLowerCase()))
          .map((chat, index) => (
            <div
              className={`chat-item ${selectedChat === chat.name ? "active-chat" : ""}`}
              key={index}
              onClick={() => setSelectedChat(chat.name)}
            >
              <div className="avatar">{chat.name.charAt(0)}</div>

              <div className="chat-info">
                <h4>{chat.name}</h4>
                <p>{chat.message}</p>
              </div>

              <div className="chat-meta">
                <span>{chat.time}</span>
                {chat.unread > 0 && <div className="unread-badge">{chat.unread}</div>}
                {chat.online && <div className="online-dot"></div>}
              </div>
            </div>
          ))}
      </div>

      <div className="chat-window">
        <div className="chat-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="avatar">{selectedChat.charAt(0)}</div>

            <div>
              <h3>{selectedChat}</h3>
              <p
                style={{
                  color: "#22c55e",
                  fontSize: "13px",
                  marginTop: "2px",
                }}
              >
                Online
              </p>
            </div>

            <div style={{ marginLeft: "auto", position: "relative" }}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "white",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
              >
                ⋮
              </button>

              {showMenu && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "40px",
                    background: "#1f2937",
                    padding: "10px",
                    borderRadius: "10px",
                    width: "180px",
                    zIndex: 999,
                  }}
                >
                  <p
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setShowSettingsPage(true);
                      setShowMenu(false);
                    }}
                  >
                    ⚙️ Settings
                  </p>

                  <p style={{ cursor: "pointer" }} onClick={logout}>
                    🚪 Logout
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="messages">
          {allChats[selectedChat].map((msg, index) => (
            <div key={index} className={`message ${msg.type}`}>
              <div>{msg.text}</div>

              <small>
                {msg.time}
                {msg.type === "sent" && <span style={{ marginLeft: "5px" }}>✔✔</span>}
              </small>
            </div>
          ))}

          {typing && (
            <>
              <div className="typing">{selectedChat} is typing...</div>

              <div style={{ color: "white" }}>
                Firebase Messages: {firebaseMessages.length}
              </div>
            </>
          )}
        </div>

        <div className="message-input">
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
          />

          <button onClick={sendMessage}>Send</button>
        </div>
      </div>

      {showSettingsPage ? (
        <div className="settings-page">
          <div className="settings-header">
            <button onClick={() => setShowSettingsPage(false)}>← Back</button>
            <h2>Settings</h2>
          </div>

          {user && (
            <div className="profile-card">
              <img src={user.photoURL} alt="" className="profile-img" />
              <h3>{user.displayName}</h3>
              <p>{user.email}</p>
            </div>
          )}

          <button className="setting-item" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>

          <button className="setting-item logout-btn" onClick={logout}>
            🚪 Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default App;
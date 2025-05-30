import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const ChatRoom = () => {
  const [user, setUser] = useState("");
  const [message, setMessage] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showActionsId, setShowActionsId] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("edit_message", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === updatedMsg._id ? updatedMsg : msg))
      );
    });

    socket.on("delete_message", (id) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== id));
    });

    return () => {
      socket.off("receive_message");
      socket.off("edit_message");
      socket.off("delete_message");
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const joinRoom = async () => {
    if (room.trim() !== "" && user.trim() !== "") {
      socket.emit("join_room", room);
      try {
        const response = await fetch(`http://localhost:5000/messages/${room}`);
        const data = await response.json();
        setMessages(data);
        setJoined(true);
      } catch {
        alert("Failed to join room or fetch messages.");
      }
    }
  };

  const sendMessage = async () => {
    if (uploading || (!message.trim() && !selectedFile)) return;
    setUploading(true);

    if (selectedFile) {
      const formData = new FormData();
      formData.append("file", selectedFile);

      try {
        const res = await fetch("http://localhost:5000/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        const msgData = { user, message: "", room, fileUrl: data.fileUrl };

        await fetch("http://localhost:5000/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(msgData),
        });
      } catch {
        alert("Upload failed");
      }

      setSelectedFile(null);
      setMessage("");
      setUploading(false);
    } else {
      const msgData = { user, message: message.trim(), room };

      try {
        await fetch("http://localhost:5000/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(msgData),
        });
        setMessage("");
      } catch {
        alert("Failed to send message");
      }
      setUploading(false);
    }
  };

  const startEdit = (msg) => {
    setEditingId(msg._id);
    setEditText(msg.message);
    setShowActionsId(null); // auto-hide
  };

  const saveEdit = async (id) => {
    if (editText.trim() === "") return;

    try {
      await fetch(`http://localhost:5000/messages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: editText.trim() }),
      });

      setEditingId(null);
      setEditText("");
      setShowActionsId(null); // auto-hide
    } catch {
      alert("Failed to save edit");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setShowActionsId(null); // auto-hide
  };

  const deleteMessage = async (id) => {
    try {
      await fetch(`http://localhost:5000/messages/${id}`, { method: "DELETE" });
      setShowActionsId(null); // auto-hide
    } catch {
      alert("Failed to delete message");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const toggleActions = (id) => {
    setShowActionsId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="chat-container">
      <h2>Realtime Chat App</h2>
      {!joined ? (
        <div className="join-room">
          <input
            type="text"
            placeholder="Your Name"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
          <input
            type="text"
            placeholder="Room ID"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      ) : (
        <div className="chat-box">
          <div className="chat-messages">
            {messages.map((msg) => (
              <div
                key={msg._id}
                className={`chat-message ${msg.user === user ? "own" : ""}`}
                onClick={() => msg.user === user && toggleActions(msg._id)}
              >
                <div className="msg-header">
                  <strong>{msg.user}</strong>
                  {msg.user === user && showActionsId === msg._id && (
                    <div className="msg-actions">
                      <button onClick={() => startEdit(msg)}>Edit</button>
                      <button onClick={() => deleteMessage(msg._id)}>Delete</button>
                    </div>
                  )}
                </div>

                {editingId === msg._id ? (
                  <div className="edit-container">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <button onClick={() => saveEdit(msg._id)}>Save</button>
                    <button onClick={cancelEdit}>Cancel</button>
                  </div>
                ) : msg.fileUrl ? (
                  <div>
                    <a href={msg.fileUrl} target="_blank" rel="noreferrer">
                      {msg.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                        <img
                          src={msg.fileUrl}
                          alt="uploaded"
                          className="uploaded-image"
                        />
                      ) : (
                        <span>{msg.fileUrl.split("/").pop()}</span>
                      )}
                    </a>
                  </div>
                ) : (
                  <p>{msg.message}</p>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            <input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={uploading}
            />
            <button onClick={sendMessage} disabled={uploading}>
              Send
            </button>

            <label className="file-upload">
              📎
              <input
                type="file"
                hidden
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>

            {selectedFile && (
              <div className="file-preview">
                Selected file: {selectedFile.name}{" "}
                <button onClick={() => setSelectedFile(null)}>Remove</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;

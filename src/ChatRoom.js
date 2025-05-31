import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

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
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection on mount
    socketRef.current = io("http://localhost:5000");

    // Setup socket listeners
    socketRef.current.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socketRef.current.on("edit_message", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === updatedMsg._id ? updatedMsg : msg))
      );
    });

    socketRef.current.on("delete_message", (id) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== id));
    });

    return () => {
      // Clean up listeners and disconnect socket on unmount
      socketRef.current.off("receive_message");
      socketRef.current.off("edit_message");
      socketRef.current.off("delete_message");
      socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    // Auto scroll chat to bottom when messages update
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const joinRoom = async () => {
    if (room.trim() === "" || user.trim() === "") return;
    socketRef.current.emit("join_room", room);

    try {
      const response = await fetch(`http://localhost:5000/messages/${room}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      setMessages(data);
      setJoined(true);
    } catch (error) {
      alert("Failed to join room or fetch messages.");
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
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        const msgData = { user, message: "", room, fileUrl: data.fileUrl };

        const resMsg = await fetch("http://localhost:5000/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(msgData),
        });
        if (!resMsg.ok) throw new Error("Failed to send message");

        setSelectedFile(null);
        setMessage("");
      } catch (err) {
        alert(err.message || "Upload failed");
      } finally {
        setUploading(false);
      }
    } else {
      try {
        const msgData = { user, message: message.trim(), room };
        const res = await fetch("http://localhost:5000/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(msgData),
        });
        if (!res.ok) throw new Error("Failed to send message");
        setMessage("");
      } catch (err) {
        alert(err.message || "Failed to send message");
      } finally {
        setUploading(false);
      }
    }
  };

  const startEdit = (msg) => {
    setEditingId(msg._id);
    setEditText(msg.message);
    setShowActionsId(null);
  };

  const saveEdit = async (id) => {
    if (editText.trim() === "") return;
    try {
      const res = await fetch(`http://localhost:5000/messages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: editText.trim() }),
      });
      if (!res.ok) throw new Error("Failed to save edit");

      setEditingId(null);
      setEditText("");
      setShowActionsId(null);
    } catch {
      alert("Failed to save edit");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setShowActionsId(null);
  };

  const deleteMessage = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/messages/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete message");

      setShowActionsId(null);
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
      <h2>Chat App</h2>
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
          <button onClick={joinRoom} disabled={!user.trim() || !room.trim()}>
            Join Room
          </button>
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
                      disabled={uploading}
                    />
                    <button onClick={() => saveEdit(msg._id)} disabled={uploading}>
                      Save
                    </button>
                    <button onClick={cancelEdit} disabled={uploading}>
                      Cancel
                    </button>
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
            <button onClick={sendMessage} disabled={uploading || (!message.trim() && !selectedFile)}>
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
                <button onClick={() => setSelectedFile(null)} disabled={uploading}>
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;

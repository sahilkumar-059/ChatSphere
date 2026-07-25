import { useState, useRef, useEffect } from "react";
import EmojiPicker from "./EmojiPicker";
import AttachmentSheet from "./AttachmentSheet";
import CameraCapture from "./CameraCapture";
import VoiceRecorder from "./VoiceRecorder";

export default function Composer({
  messageInput,
  onMessageInputChange,
  onSendMessage,
  onTyping,
  isRecording,
  onDropFiles,
  onDragOver,
  dragPreview,
  onSendFile,
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const textareaRef = useRef(null);
  const composerRef = useRef(null);
  const fileInputRef = useRef(null);
  const pasteAreaRef = useRef(null);

  // Auto-grow textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  }, [messageInput]);

  // Focus textarea when composer mounts
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Handle paste (images)
  useEffect(() => {
    const handlePaste = (e) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageFiles = items
        .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter(Boolean);

      if (imageFiles.length > 0 && onDropFiles) {
        e.preventDefault();
        onDropFiles(imageFiles);
      }
    };

    const el = pasteAreaRef.current || composerRef.current;
    if (el) {
      el.addEventListener("paste", handlePaste);
      return () => el.removeEventListener("paste", handlePaste);
    }
  }, [onDropFiles]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (messageInput.trim()) {
      onSendMessage();
      textareaRef.current?.focus();
    }
  };

  const handleEmojiSelect = (emoji) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = messageInput.substring(0, start) + emoji + messageInput.substring(end);
      onMessageInputChange(newValue);
      // Restore cursor position after emoji
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      });
    } else {
      onMessageInputChange(messageInput + emoji);
    }
    onTyping();
  };

  const handleAttachmentSelect = (files) => {
    setShowAttachmentSheet(false);
    if (files && files.length > 0 && onSendFile) {
      onSendFile(files);
    }
  };

  const handleCameraCapture = (file) => {
    setShowCamera(false);
    if (file && onSendFile) {
      onSendFile([{ file, name: file.name, size: file.size, type: file.type, category: "image" }]);
    }
  };

  const handleVoiceComplete = (blob) => {
    setShowVoiceRecorder(false);
    if (blob && onSendFile) {
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
      onSendFile([{ file, name: file.name, size: file.size, type: file.type, category: "audio" }]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (onDragOver) onDragOver(e);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (onDropFiles) onDropFiles(e.dataTransfer.files);
  };

  const hasInput = messageInput.trim().length > 0;

  return (
    <div className="composer-wrapper" ref={composerRef}>
      {/* Drag preview banner */}
      {dragPreview && (
        <div className="composer-drag-banner">
          <span>📎</span> {dragPreview}
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="composer-emoji-overlay">
          <div className="composer-emoji-panel">
            <div className="composer-emoji-header">
              <span>Emoji</span>
              <button className="composer-emoji-close" onClick={() => setShowEmojiPicker(false)}>✕</button>
            </div>
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          </div>
        </div>
      )}

      {/* Attachment Sheet */}
      {showAttachmentSheet && (
        <AttachmentSheet
          onSelect={handleAttachmentSelect}
          onClose={() => setShowAttachmentSheet(false)}
          onCameraRequest={() => { setShowAttachmentSheet(false); setShowCamera(true); }}
        />
      )}

      {/* Camera Capture */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Voice Recorder */}
      {showVoiceRecorder && (
        <VoiceRecorder
          onComplete={handleVoiceComplete}
          onClose={() => setShowVoiceRecorder(false)}
        />
      )}

      {/* Main composer bar */}
      <div className="composer-bar" onDragOver={handleDragOver} onDrop={handleDrop} ref={pasteAreaRef}>
        {/* Emoji button */}
        <button
          className={`composer-btn emoji-btn ${showEmojiPicker ? "active" : ""}`}
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          type="button"
          aria-label="Emoji"
          title="Emoji"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
          </svg>
        </button>

        {/* Message input */}
        <div className="composer-input-wrap">
          <textarea
            ref={textareaRef}
            className="composer-textarea"
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => {
              onMessageInputChange(e.target.value);
              onTyping();
            }}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        </div>

        {/* Right side buttons */}
        <div className="composer-right-actions">
          {/* Attachment button */}
          <button
            className="composer-btn attach-btn"
            onClick={() => setShowAttachmentSheet(true)}
            type="button"
            aria-label="Attach"
            title="Attach"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
            </svg>
          </button>

          {/* Camera button */}
          <button
            className="composer-btn camera-btn"
            onClick={() => setShowCamera(true)}
            type="button"
            aria-label="Camera"
            title="Camera"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 15.2c-1.76 0-3.2-1.44-3.2-3.2s1.44-3.2 3.2-3.2 3.2 1.44 3.2 3.2-1.44 3.2-3.2 3.2zm-9-5.2v6c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-1.5l-1.5-2h-5l-1.5 2H5c-1.1 0-2 .9-2 2zm15 6H6V10h1.5l1.5-2h5l1.5 2H18v6z"/>
            </svg>
          </button>

          {/* Dynamic mic/send button */}
          {hasInput ? (
            <button
              className="composer-send-btn"
              onClick={handleSend}
              type="button"
              aria-label="Send"
              title="Send"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          ) : (
            <button
              className={`composer-btn mic-btn ${isRecording ? "recording" : ""}`}
              onClick={() => setShowVoiceRecorder(true)}
              type="button"
              aria-label="Voice message"
              title="Voice message"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Hidden file input for direct upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files);
          if (files.length > 0 && onSendFile) {
            onSendFile(files.map((f) => ({ file: f, name: f.name, size: f.size, type: f.type, category: "document" })));
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}
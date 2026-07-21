import { useState, useRef, useEffect } from "react";
import { validateFile, formatFileSize, getFileIcon, compressImage } from "../services/fileUploadService";

export default function FileAttachmentPicker({ onFileSelect, onClose }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const audioInputRef = useRef(null);

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  // Handle file input change
  const handleFileSelect = (e, type = null) => {
    const files = Array.from(e.target.files);
    processFiles(files, type);
    // Reset input
    e.target.value = "";
  };

  // Process and validate files
  const processFiles = async (files, type = null) => {
    const validFiles = [];

    for (const file of files) {
      const validation = validateFile(file, type);
      
      if (!validation.valid) {
        alert(`${file.name}: ${validation.error}`);
        continue;
      }

      // Compress images if needed
      let processedFile = file;
      if (file.type.startsWith("image/") && file.size > 2 * 1024 * 1024) {
        try {
          processedFile = await compressImage(file);
        } catch (error) {
          console.error("Error compressing image:", error);
        }
      }

      // Create preview URL
      let previewUrl = null;
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        previewUrl = URL.createObjectURL(processedFile);
      }

      validFiles.push({
        file: processedFile,
        previewUrl,
        name: processedFile.name,
        size: processedFile.size,
        type: processedFile.type,
        category: type || getFileCategory(processedFile.type),
      });
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  // Get file category
  const getFileCategory = (mimeType) => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    return "document";
  };

  // Remove file from selection
  const removeFile = (index) => {
    setSelectedFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index].previewUrl) {
        URL.revokeObjectURL(newFiles[index].previewUrl);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  // Handle send
  const handleSend = () => {
    if (selectedFiles.length > 0 && onFileSelect) {
      onFileSelect(selectedFiles);
      setSelectedFiles([]);
      onClose();
    }
  };

  // Trigger file input
  const triggerFileInput = (type) => {
    switch (type) {
      case "image":
        imageInputRef.current?.click();
        break;
      case "video":
        videoInputRef.current?.click();
        break;
      case "document":
        documentInputRef.current?.click();
        break;
      case "audio":
        audioInputRef.current?.click();
        break;
      default:
        fileInputRef.current?.click();
    }
  };

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = (e) => {
      const items = Array.from(e.clipboardData?.items || []);
      const files = [];

      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        processFiles(files);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      selectedFiles.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
    };
  }, [selectedFiles]);

  return (
    <div className="file-attachment-picker-overlay" onClick={onClose}>
      <div className="file-attachment-picker" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="file-picker-header">
          <h3>Attach Files</h3>
          <button className="file-picker-close" onClick={onClose}>✕</button>
        </div>

        {/* Drag & Drop Zone */}
        <div
          className={`file-drop-zone ${dragActive ? "active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => triggerFileInput("all")}
        >
          <div className="file-drop-icon">📎</div>
          <p>Drag & drop files here or click to browse</p>
          <p className="file-drop-hint">Images, Videos, Documents, Audio</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={handleFileSelect}
          />
        </div>

        {/* Quick Actions */}
        <div className="file-quick-actions">
          <button className="file-action-button" onClick={() => triggerFileInput("image")}>
            <span className="file-action-icon">🖼️</span>
            <span>Image</span>
          </button>
          <button className="file-action-button" onClick={() => triggerFileInput("video")}>
            <span className="file-action-icon">🎬</span>
            <span>Video</span>
          </button>
          <button className="file-action-button" onClick={() => triggerFileInput("document")}>
            <span className="file-action-icon">📄</span>
            <span>Document</span>
          </button>
          <button className="file-action-button" onClick={() => triggerFileInput("audio")}>
            <span className="file-action-icon">🎵</span>
            <span>Audio</span>
          </button>
        </div>

        {/* Hidden inputs for specific types */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          multiple
          hidden
          onChange={(e) => handleFileSelect(e, "image")}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          multiple
          hidden
          onChange={(e) => handleFileSelect(e, "video")}
        />
        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar,.apk"
          multiple
          hidden
          onChange={(e) => handleFileSelect(e, "document")}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/m4a"
          multiple
          hidden
          onChange={(e) => handleFileSelect(e, "audio")}
        />

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="file-selected-list">
            <h4>Selected Files ({selectedFiles.length})</h4>
            {selectedFiles.map((file, index) => (
              <div key={index} className="file-selected-item">
                {file.previewUrl ? (
                  <div className="file-preview-media">
                    {file.category === "image" ? (
                      <img src={file.previewUrl} alt={file.name} />
                    ) : (
                      <video src={file.previewUrl} />
                    )}
                  </div>
                ) : (
                  <div className="file-preview-icon">
                    <span>{getFileIcon(file.type, file.name)}</span>
                  </div>
                )}
                <div className="file-preview-info">
                  <p className="file-preview-name">{file.name}</p>
                  <p className="file-preview-size">{formatFileSize(file.size)}</p>
                </div>
                <button
                  className="file-preview-remove"
                  onClick={() => removeFile(index)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="file-picker-footer">
          <button className="file-picker-button secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="file-picker-button primary"
            onClick={handleSend}
            disabled={selectedFiles.length === 0}
          >
            Send {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

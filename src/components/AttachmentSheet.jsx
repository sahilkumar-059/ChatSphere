import { useRef, useEffect } from "react";
import { compressImage } from "../services/fileUploadService";

const ATTACHMENT_OPTIONS = [
  { id: "photo", icon: "🖼️", label: "Photo & Video", desc: "From gallery", accept: "image/*,video/*", multiple: true },
  { id: "camera", icon: "📷", label: "Camera", desc: "Capture photo", accept: null },
  { id: "document", icon: "📄", label: "Document", desc: "PDF, DOC, TXT", accept: ".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.zip", multiple: true },
  { id: "audio", icon: "🎵", label: "Audio", desc: "Music, podcast", accept: "audio/*", multiple: true },
  { id: "location", icon: "📍", label: "Location", desc: "Share location" },
  { id: "contact", icon: "👤", label: "Contact", desc: "Share contact" },
];

export default function AttachmentSheet({ onSelect, onClose, onCameraRequest }) {
  const overlayRef = useRef(null);

  // Close on overlay click
  useEffect(() => {
    const handleClick = (e) => {
      if (e.target === overlayRef.current) onClose();
    };
    const overlay = overlayRef.current;
    if (overlay) overlay.addEventListener("click", handleClick);
    return () => {
      if (overlay) overlay.removeEventListener("click", handleClick);
    };
  }, [onClose]);

  const handleOption = async (option) => {
    if (option.id === "camera") {
      onCameraRequest();
      return;
    }
    if (option.id === "location") {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            onSelect([{
              file: null,
              name: "Location",
              type: "location",
              category: "location",
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }]);
            onClose();
          },
          () => alert("Could not get location. Check permissions."),
          { enableHighAccuracy: true }
        );
      }
      return;
    }
    if (option.id === "contact") {
      // Create a simple vCard and send as text
      const contactData = { phone: prompt("Enter phone number:"), name: prompt("Enter contact name:") };
      if (contactData.phone && contactData.name) {
        onSelect([{ file: null, name: `${contactData.name}.vcf`, type: "text/vcard", category: "contact", contactData }]);
        onClose();
      }
      return;
    }

    // File picker
    const input = document.createElement("input");
    input.type = "file";
    if (option.accept) input.accept = option.accept;
    if (option.multiple) input.multiple = true;

    input.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) {
        console.log("No files selected");
        return;
      }

      try {
        const processed = [];
        for (const file of files) {
          let processedFile = file;
          if (file.type.startsWith("image/") && file.size > 2 * 1024 * 1024) {
            try {
              processedFile = await compressImage(file);
            } catch (err) {
              console.error("Compress error:", err);
            }
          }
          processed.push({
            file: processedFile,
            name: processedFile.name,
            size: processedFile.size,
            type: processedFile.type,
            category: option.id === "photo" ? (file.type.startsWith("video/") ? "video" : "image") : option.id,
          });
        }
        console.log("Files processed:", processed.length);
        onSelect(processed);
        onClose();
      } catch (error) {
        console.error("Error processing files:", error);
      }
    }, { once: true });

    input.click();
  };

  return (
    <div className="attachment-sheet-overlay" ref={overlayRef}>
      <div className="attachment-sheet">
        <div className="attachment-sheet-handle" />
        <div className="attachment-sheet-header">
          <h3>Share</h3>
          <button className="attachment-sheet-close" onClick={onClose}>✕</button>
        </div>
        <div className="attachment-sheet-grid">
          {ATTACHMENT_OPTIONS.map((option) => (
            <button
              key={option.id}
              className="attachment-option"
              onClick={() => handleOption(option)}
            >
              <span className="attachment-option-icon">{option.icon}</span>
              <span className="attachment-option-label">{option.label}</span>
              <span className="attachment-option-desc">{option.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
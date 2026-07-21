import { useState } from "react";

export default function ImageMessage({ imageUrl, fileName, onDownload }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handleDownload = () => {
    if (onDownload) {
      onDownload(imageUrl, fileName || "image.jpg");
    } else {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = fileName || "image.jpg";
      link.click();
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  return (
    <>
      <div className="image-message" onClick={() => setIsFullscreen(true)}>
        <img src={imageUrl} alt={fileName || "Image"} />
        <div className="image-message-overlay">
          <button className="image-message-button" onClick={(e) => { e.stopPropagation(); handleDownload(); }}>
            ⬇️
          </button>
          <button className="image-message-button" onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}>
            🔍
          </button>
        </div>
      </div>

      {isFullscreen && (
        <div className="image-fullscreen-overlay" onClick={() => setIsFullscreen(false)}>
          <div className="image-fullscreen-container" onClick={(e) => e.stopPropagation()}>
            <button className="image-fullscreen-close" onClick={() => setIsFullscreen(false)}>✕</button>
            
            <div className="image-fullscreen-toolbar">
              <button onClick={handleZoomOut} disabled={zoom <= 0.5}>➖</button>
              <span>{Math.round(zoom * 100)}%</span>
              <button onClick={handleZoomIn} disabled={zoom >= 3}>➕</button>
              <button onClick={handleResetZoom}>↺</button>
              <button onClick={handleDownload}>⬇️ Download</button>
            </div>

            <div className="image-fullscreen-content" style={{ transform: `scale(${zoom})` }}>
              <img src={imageUrl} alt={fileName || "Image"} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

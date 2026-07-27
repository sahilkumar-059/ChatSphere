import { useState, useRef, useEffect, useCallback } from "react";
import "./MediaViewer.css";

// Helper: format timestamp
function formatTime(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : date.toDate?.() || new Date(date);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Helper: format file size
function formatSize(bytes) {
  if (!bytes) return "Unknown";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export default function MediaViewer({
  images,
  initialIndex = 0,
  onClose,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const imageAreaRef = useRef(null);
  const dragStartRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchZoomRef = useRef(null);
  const menuRef = useRef(null);

  const currentImage = images[currentIndex];
  const totalImages = images.length;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < totalImages - 1;

  // Reset zoom/position when image changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setLoading(true);
    setError(false);
    setImageLoaded(false);
    setMenuOpen(false);
  }, [currentIndex]);

  // Close handler with animation
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowLeft" && hasPrev) setCurrentIndex((i) => i - 1);
      if (e.key === "ArrowRight" && hasNext) setCurrentIndex((i) => i + 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [hasPrev, hasNext, handleClose]);

  // Handle background click
  const handleAreaClick = (e) => {
    if (e.target === imageAreaRef.current) {
      handleClose();
    }
  };

  // Zoom via wheel
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(0.25, Math.min(5, prev + delta)));
  }, []);

  // Double-click to zoom
  const handleDoubleClick = () => {
    if (zoom > 1.5) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setZoom(3);
    }
  };

  // Mouse drag to pan
  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e) => {
    if (!dragStartRef.current) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    dragStartRef.current = null;
  };

  // Touch handlers for mobile
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchZoomRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchZoomRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / touchZoomRef.current;
      setZoom((prev) => Math.max(0.5, Math.min(5, prev * scale)));
      touchZoomRef.current = dist;
    }
  };

  const handleTouchEnd = (e) => {
    if (e.changedTouches.length === 1 && touchStartRef.current) {
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      const elapsed = Date.now() - touchStartRef.current.time;

      // Swipe detection (fast horizontal swipe > 50px)
      if (Math.abs(dx) > 50 && Math.abs(dy) < 100 && elapsed < 300) {
        if (dx > 0 && hasPrev) setCurrentIndex((i) => i - 1);
        else if (dx < 0 && hasNext) setCurrentIndex((i) => i + 1);
      }
    }
    touchStartRef.current = null;
    touchZoomRef.current = null;
  };

  // Image loaded
  const handleImageLoad = () => {
    setLoading(false);
    setImageLoaded(true);
  };

  // Image error
  const handleImageError = () => {
    setLoading(false);
    setError(true);
  };

  // Menu actions
  const downloadImage = async () => {
    try {
      const response = await fetch(currentImage.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = currentImage.fileName || `image-${currentIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback: open in new tab and let user save manually
      window.open(currentImage.imageUrl, "_blank");
    }
    setMenuOpen(false);
  };

  const openInNewTab = () => {
    window.open(currentImage.imageUrl, "_blank");
    setMenuOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentImage.imageUrl);
      alert("Image link copied to clipboard!");
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = currentImage.imageUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      alert("Image link copied to clipboard!");
    }
    setMenuOpen(false);
  };

  const showInfo = () => {
    const dims = imageDimensions.width && imageDimensions.height
      ? `${imageDimensions.width} × ${imageDimensions.height}`
      : "Loading...";
    alert(
      `Image Information:\n\nName: ${currentImage.fileName || "Unknown"}\nSize: ${formatSize(currentImage.fileSize)}\nType: ${currentImage.mimeType || "Unknown"}\nDimensions: ${dims}\nURL: ${currentImage.imageUrl}`
    );
    setMenuOpen(false);
  };

  // Click outside menu to close
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  if (!currentImage) return null;

  return (
    <div
      className={`media-viewer-overlay ${closing ? "closing" : ""}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Toolbar */}
      <div className="media-toolbar">
        <div className="media-toolbar-left">
          <button className="media-toolbar-back" onClick={handleClose} aria-label="Back">
            ←
          </button>
          <div className="media-toolbar-info">
            <span className="media-toolbar-name">
              {currentImage.senderName || "Unknown"}
            </span>
            <span className="media-toolbar-time">
              {formatTime(currentImage.createdAt)}
            </span>
          </div>
        </div>

        <div className="media-toolbar-right">
          {/* Three-dot menu */}
          <div className="media-menu-container" ref={menuRef}>
            <button
              className="media-toolbar-btn"
              onClick={() => setMenuOpen((p) => !p)}
              aria-label="More options"
            >
              ⋮
            </button>
            {menuOpen && (
              <div className="media-menu-dropdown">
                <button className="media-menu-item" onClick={downloadImage}>
                  <span className="media-menu-icon">⬇</span>
                  Download Image
                </button>
                <button className="media-menu-item" onClick={openInNewTab}>
                  <span className="media-menu-icon">↗</span>
                  Open in New Tab
                </button>
                <button className="media-menu-item" onClick={copyLink}>
                  <span className="media-menu-icon">🔗</span>
                  Copy Image Link
                </button>
                <div className="media-menu-divider" />
                <button className="media-menu-item" onClick={showInfo}>
                  <span className="media-menu-icon">ℹ</span>
                  Image Information
                </button>
              </div>
            )}
          </div>

          <button className="media-toolbar-close" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>
      </div>

      {/* Image Area */}
      <div
        className="media-image-area"
        ref={imageAreaRef}
        onClick={handleAreaClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* Loading */}
        {loading && (
          <div className="media-loading">
            <div className="media-loading-spinner" />
            <span className="media-loading-text">Loading image...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="media-error">
            <div className="media-error-icon">🖼️</div>
            <div className="media-error-title">Could not load image</div>
            <div className="media-error-text">The image may have been removed or is unavailable</div>
            <button className="media-error-retry" onClick={() => { setLoading(true); setError(false); }}>
              Try Again
            </button>
          </div>
        )}

        {/* Image */}
        {!error && (
          <div
            className="media-image-wrapper"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            }}
          >
            <img
              className="media-image"
              src={currentImage.imageUrl}
              alt={currentImage.text || "Shared image"}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ display: imageLoaded ? "block" : "none" }}
              draggable={false}
              onLoadCapture={(e) => {
                // Store dimensions in local state for info display
                setImageDimensions({
                  width: e.target.naturalWidth,
                  height: e.target.naturalHeight,
                });
              }}
            />
          </div>
        )}

        {/* Navigation arrows */}
        <button
          className={`media-nav-btn prev ${!hasPrev ? "hidden" : ""}`}
          onClick={(e) => { e.stopPropagation(); setCurrentIndex((i) => i - 1); }}
          aria-label="Previous"
        >
          ‹
        </button>
        <button
          className={`media-nav-btn next ${!hasNext ? "hidden" : ""}`}
          onClick={(e) => { e.stopPropagation(); setCurrentIndex((i) => i + 1); }}
          aria-label="Next"
        >
          ›
        </button>

        {/* Image counter */}
        {totalImages > 1 && (
          <div className="media-counter">
            {currentIndex + 1} / {totalImages}
          </div>
        )}

        {/* Zoom controls */}
        <div className="media-zoom-controls">
          <button className="media-zoom-btn" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))} aria-label="Zoom out">−</button>
          <span className="media-zoom-level">{Math.round(zoom * 100)}%</span>
          <button className="media-zoom-btn" onClick={() => setZoom((z) => Math.min(5, z + 0.25))} aria-label="Zoom in">+</button>
          {zoom !== 1 && (
            <button className="media-zoom-btn reset" onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }}>
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Bottom bar (mobile) */}
      <div className="media-bottom-bar">
        <button className="media-toolbar-btn" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={!hasPrev}>
          ‹
        </button>
        <span style={{ color: "#94a3b8", fontSize: 14 }}>
          {currentIndex + 1} / {totalImages}
        </span>
        <button className="media-toolbar-btn" onClick={() => setCurrentIndex((i) => Math.min(totalImages - 1, i + 1))} disabled={!hasNext}>
          ›
        </button>
      </div>
    </div>
  );
}
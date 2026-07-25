import { useState, useRef, useEffect, useCallback } from "react";

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");

  // Start camera
  const startCamera = useCallback(async (facing = facingMode) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreaming(true);
      setError(null);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera. Check permissions.");
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedImage(URL.createObjectURL(blob));
        // Stop camera
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        setStreaming(false);
      }
    }, "image/jpeg", 0.9);
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmSend = () => {
    if (capturedImage) {
      // Convert blob URL to file
      fetch(capturedImage)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
          onCapture(file);
        })
        .catch(() => {
          // Fallback: create from canvas
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.toBlob((blob) => {
              if (blob) {
                const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
                onCapture(file);
              }
            }, "image/jpeg", 0.9);
          }
        });
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    startCamera(facingMode === "environment" ? "user" : "environment");
  };

  return (
    <div className="camera-capture-overlay">
      <div className="camera-capture">
        {/* Header */}
        <div className="camera-header">
          <button className="camera-close-btn" onClick={onClose}>✕</button>
          <h3>Camera</h3>
          <button className="camera-flip-btn" onClick={toggleCamera} disabled={!streaming}>
            🔄
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="camera-error">
            <p>{error}</p>
            <button className="camera-retry-btn" onClick={() => startCamera()}>Retry</button>
          </div>
        )}

        {/* Preview / Capture */}
        <div className="camera-viewfinder">
          {capturedImage ? (
            <img src={capturedImage} alt="Captured" className="camera-preview-img" />
          ) : (
            <>
              <video ref={videoRef} className="camera-video" playsInline muted />
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </>
          )}
        </div>

        {/* Actions */}
        <div className="camera-actions">
          {capturedImage ? (
            <>
              <button className="camera-action-btn retake-btn" onClick={retake}>
                🔄 Retake
              </button>
              <button className="camera-action-btn send-btn" onClick={confirmSend}>
                ✓ Send
              </button>
            </>
          ) : (
            <button
              className="camera-capture-btn"
              onClick={capture}
              disabled={!streaming}
            >
              <span className="camera-shutter" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
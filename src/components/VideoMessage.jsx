import { useState, useRef } from "react";

export default function VideoMessage({ videoUrl, fileName, onDownload }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  const handleDownload = () => {
    if (onDownload) {
      onDownload(videoUrl, fileName || "video.mp4");
    } else {
      const link = document.createElement("a");
      link.href = videoUrl;
      link.download = fileName || "video.mp4";
      link.click();
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="video-message">
      <div className="video-container">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          onClick={handlePlayPause}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>
      <div className="video-message-actions">
        <button className="video-action-button" onClick={handleDownload} title="Download">
          ⬇️
        </button>
        <button className="video-action-button" onClick={handleFullscreen} title="Fullscreen">
          ⛶
        </button>
      </div>
    </div>
  );
}

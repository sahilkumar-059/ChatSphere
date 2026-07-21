import { useState, useRef, useEffect } from "react";

export default function AudioMessage({ audioUrl, fileName, duration }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (audio) {
      const seekTime = (e.target.value / 100) * audio.duration;
      audio.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleSpeedChange = (speed) => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = audioRef.current ? (currentTime / audioRef.current.duration) * 100 : 0;

  return (
    <div className="audio-message">
      <audio ref={audioRef} src={audioUrl} />
      
      <button className="audio-play-button" onClick={handlePlayPause}>
        {isPlaying ? "⏸️" : "▶️"}
      </button>

      <div className="audio-progress-container">
        <div className="audio-progress-bar">
          <div className="audio-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <input
          type="range"
          className="audio-seek-slider"
          min="0"
          max="100"
          value={progress}
          onChange={handleSeek}
        />
        <span className="audio-time">
          {formatTime(currentTime)} / {formatTime(audioRef.current?.duration || duration || 0)}
        </span>
      </div>

      <div className="audio-speed-controls">
        <button
          className={`audio-speed-button ${playbackSpeed === 1 ? "active" : ""}`}
          onClick={() => handleSpeedChange(1)}
        >
          1x
        </button>
        <button
          className={`audio-speed-button ${playbackSpeed === 1.5 ? "active" : ""}`}
          onClick={() => handleSpeedChange(1.5)}
        >
          1.5x
        </button>
        <button
          className={`audio-speed-button ${playbackSpeed === 2 ? "active" : ""}`}
          onClick={() => handleSpeedChange(2)}
        >
          2x
        </button>
      </div>
    </div>
  );
}

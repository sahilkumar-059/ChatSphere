import { useState, useRef, useEffect } from "react";

export default function VoiceRecorder({ onRecordingComplete, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioPreviewRef = useRef(null);

  // Format duration as MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not access microphone. Please allow microphone access.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setIsPaused(false);
      clearInterval(timerRef.current);
    }
  };

  // Pause/Resume recording
  const togglePause = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        timerRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        clearInterval(timerRef.current);
      }
    }
  };

  // Delete recording
  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsRecording(false);
    setIsPaused(false);
    clearInterval(timerRef.current);
  };

  // Send recording
  const sendRecording = () => {
    if (audioBlob && onRecordingComplete) {
      onRecordingComplete({
        file: audioBlob,
        duration,
        type: "voice",
      });
      deleteRecording();
    }
  };

  // Preview audio
  const togglePreview = () => {
    if (audioPreviewRef.current) {
      if (isPlayingPreview) {
        audioPreviewRef.current.pause();
      } else {
        audioPreviewRef.current.play();
      }
      setIsPlayingPreview(!isPlayingPreview);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className="voice-recorder">
      {!audioBlob ? (
        // Recording UI
        <div className="voice-recorder-recording">
          <div className="voice-recorder-wave">
            {isRecording && !isPaused && (
              <>
                <span className="wave-bar" style={{ animationDelay: "0s" }} />
                <span className="wave-bar" style={{ animationDelay: "0.1s" }} />
                <span className="wave-bar" style={{ animationDelay: "0.2s" }} />
                <span className="wave-bar" style={{ animationDelay: "0.3s" }} />
                <span className="wave-bar" style={{ animationDelay: "0.4s" }} />
              </>
            )}
          </div>

          <div className="voice-recorder-timer">
            {formatDuration(duration)}
          </div>

          <div className="voice-recorder-controls">
            {!isRecording ? (
              <button className="voice-record-button" onClick={startRecording}>
                <span className="voice-record-icon">🎤</span>
                <span>Record</span>
              </button>
            ) : (
              <>
                <button className="voice-control-button" onClick={togglePause}>
                  {isPaused ? "▶️ Resume" : "⏸️ Pause"}
                </button>
                <button className="voice-control-button danger" onClick={stopRecording}>
                  ⏹️ Stop
                </button>
              </>
            )}
          </div>

          <button className="voice-cancel-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      ) : (
        // Preview UI
        <div className="voice-recorder-preview">
          <audio ref={audioPreviewRef} src={audioUrl} onEnded={() => setIsPlayingPreview(false)} />

          <div className="voice-preview-info">
            <span className="voice-preview-icon">🎤</span>
            <div className="voice-preview-details">
              <p>Voice Message</p>
              <p className="voice-preview-duration">{formatDuration(duration)}</p>
            </div>
          </div>

          <div className="voice-preview-controls">
            <button className="voice-preview-button" onClick={togglePreview}>
              {isPlayingPreview ? "⏸️" : "▶️"}
            </button>
            <button className="voice-preview-button" onClick={deleteRecording}>
              🗑️
            </button>
            <button className="voice-preview-button primary" onClick={sendRecording}>
              ➤ Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

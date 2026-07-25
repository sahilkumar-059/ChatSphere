import { useState, useRef, useEffect } from "react";

export default function VoiceRecorder({ onComplete, onClose }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [waveformData, setWaveformData] = useState([]);
  const [swipedToCancel, setSwipedToCancel] = useState(false);
  const [locked, setLocked] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const waveformIntervalRef = useRef(null);
  const startYRef = useRef(0);
  const recordButtonRef = useRef(null);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analyser for waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        cleanup();
      };

      recorder.start(100); // Collect data every 100ms for waveform
      setRecording(true);

      // Duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Waveform capture
      waveformIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteTimeDomainData(dataArray);
          // Sample a few points for waveform visualization
          const samples = [];
          for (let i = 0; i < dataArray.length; i += 8) {
            samples.push((dataArray[i] - 128) / 128);
          }
          setWaveformData((prev) => {
            const next = [...prev, samples];
            // Keep last ~60 frames (about 3 seconds visible)
            return next.slice(-60);
          });
        }
      }, 100);
    } catch (err) {
      console.error("Voice recorder error:", err);
      onClose();
    }
  };

  // Start recording on mount
  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const handleSend = () => {
    if (audioUrl) {
      fetch(audioUrl)
        .then((r) => r.blob())
        .then((blob) => {
          onComplete(blob);
          URL.revokeObjectURL(audioUrl);
        })
        .catch(() => {
          // Try from chunks directly
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          onComplete(blob);
        });
    }
  };

  const handleDiscard = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    onClose();
  };

  // Touch handling for swipe to cancel / swipe up to lock
  const handleTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (locked) return;
    const dy = e.touches[0].clientY - startYRef.current;
    // Swipe left to cancel (>80px left)
    if (e.touches[0].clientX < window.innerWidth - 100) {
      setSwipedToCancel(true);
    }
    // Swipe up to lock (>60px up)
    if (dy < -60) {
      setLocked(true);
    }
  };

  const handleTouchEnd = () => {
    if (swipedToCancel) {
      handleDiscard();
      return;
    }
    if (!locked) {
      stopRecording();
    }
  };

  // Format duration as mm:ss
  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="voice-recorder-overlay">
      <div className="voice-recorder">
        {audioUrl ? (
          // Preview mode
          <div className="voice-preview">
            <div className="voice-preview-header">
              <h3>Voice Message</h3>
              <span className="voice-preview-duration">{formatDuration(duration)}</span>
            </div>
            <audio src={audioUrl} controls className="voice-preview-audio" />
            <div className="voice-preview-actions">
              <button className="voice-action-btn discard-btn" onClick={handleDiscard}>
                ✕ Discard
              </button>
              <button className="voice-action-btn send-voice-btn" onClick={handleSend}>
                ➤ Send
              </button>
            </div>
          </div>
        ) : (
          // Recording mode
          <div className="voice-recording">
            <div className="voice-recording-header">
              <span className="voice-recording-dot" />
              <span className="voice-recording-duration">{formatDuration(duration)}</span>
              {locked && <span className="voice-locked-badge">🔒 Locked</span>}
            </div>

            {/* Waveform */}
            <div className="voice-waveform">
              {waveformData.length > 0 ? (
                waveformData.map((frame, fi) => (
                  <div key={fi} className="voice-waveform-frame">
                    {frame.map((val, vi) => (
                      <div
                        key={vi}
                        className="voice-waveform-bar"
                        style={{
                          height: `${Math.max(2, Math.abs(val) * 40 + 2)}px`,
                          opacity: 0.3 + (fi / waveformData.length) * 0.7,
                        }}
                      />
                    ))}
                  </div>
                ))
              ) : (
                <div className="voice-waveform-placeholder">Waiting for audio...</div>
              )}
            </div>

            {/* Swipe instructions */}
            <div className="voice-swipe-hints">
              {swipedToCancel ? (
                <span className="voice-swipe-cancel-active">✕ Release to cancel</span>
              ) : locked ? (
                <span className="voice-locked-hint">🔒 Tap to stop, swipe to cancel</span>
              ) : (
                <span className="voice-swipe-hint">
                  <span>← Swipe to cancel</span>
                  <span>↑ Swipe up to lock</span>
                </span>
              )}
            </div>

            {/* Record button */}
            <div
              className={`voice-record-btn-wrap ${swipedToCancel ? "cancel" : ""} ${locked ? "locked" : ""}`}
              ref={recordButtonRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={() => {}}
              onMouseUp={() => { if (!locked) stopRecording(); }}
              onMouseLeave={() => { if (!locked && recording) stopRecording(); }}
            >
              <button
                className="voice-record-btn"
                onClick={() => { if (locked) stopRecording(); }}
              >
                <span className="voice-mic-icon">🎤</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
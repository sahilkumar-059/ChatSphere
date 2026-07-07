import { useEffect, useRef, useState } from "react";
import {
  getRemoteStream,
  getLocalStream_Element,
  toggleVideo,
  toggleAudio,
  endCall,
} from "../services/callService";

export default function CallWindow({ callId, remoteName, onCallEnd, videoEnabled: initialVideoEnabled = true }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideoEnabled);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Set up local video
  useEffect(() => {
    const localStream = getLocalStream_Element();
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, []);

  // Set up remote video
  useEffect(() => {
    const remoteStream = getRemoteStream(callId);
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [callId]);

  // Update call duration
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const handleToggleVideo = async () => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    await toggleVideo(callId, newState);
  };

  const handleToggleAudio = async () => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    await toggleAudio(callId, newState);
  };

  const handleEndCall = async () => {
    await endCall(callId);
    onCallEnd();
  };

  const handleMouseDown = (e) => {
    if (e.target.closest(".call-controls")) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    if (!isDragging) return undefined;

    const handleMouseMove = (e) => {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart]);

  return (
    <div
      className="call-window-floating"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      {/* Remote video (main) */}
      <div className="call-remote-video-container">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="call-remote-video"
        />
        <div className="call-remote-label">{remoteName}</div>
        <div className="call-duration">{formatDuration(callDuration)}</div>
      </div>

      {/* Local video (picture-in-picture) */}
      {isVideoEnabled && (
        <div className="call-local-video-container">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="call-local-video"
          />
        </div>
      )}

      {/* Call controls */}
      <div className="call-controls" onMouseDown={handleMouseDown}>
        <button
          className={`call-control-btn ${isVideoEnabled ? "active" : ""}`}
          onClick={handleToggleVideo}
          title={isVideoEnabled ? "Disable video" : "Enable video"}
        >
          📹
        </button>
        <button
          className={`call-control-btn ${isAudioEnabled ? "active" : ""}`}
          onClick={handleToggleAudio}
          title={isAudioEnabled ? "Mute" : "Unmute"}
        >
          🎤
        </button>
        <button
          className="call-control-btn end-call-btn"
          onClick={handleEndCall}
          title="End call"
        >
          ❌
        </button>
      </div>
    </div>
  );
}

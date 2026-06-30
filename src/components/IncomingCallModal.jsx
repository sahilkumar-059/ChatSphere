import { useState, useEffect } from "react";
import { acceptCall, rejectCall } from "../services/callService";

export default function IncomingCallModal({ call, callerId, callerName, onAccept, onReject }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await acceptCall(call.callId, call.offer, call.videoEnabled || true);
      onAccept();
    } catch (error) {
      console.error("Error accepting call:", error);
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await rejectCall(call.callId);
      onReject();
    } catch (error) {
      console.error("Error rejecting call:", error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="incoming-call-modal-overlay">
      <div className="incoming-call-modal">
        <div className="incoming-call-header">
          <div className="incoming-call-avatar">
            {callerName?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <h2>{callerName}</h2>
          <p>is calling you...</p>
        </div>

        <div className="incoming-call-actions">
          <button
            className="call-button decline-button"
            onClick={handleReject}
            disabled={isProcessing}
          >
            <span className="call-icon">✕</span>
            Decline
          </button>
          <button
            className="call-button accept-button"
            onClick={handleAccept}
            disabled={isProcessing}
          >
            <span className="call-icon">✓</span>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

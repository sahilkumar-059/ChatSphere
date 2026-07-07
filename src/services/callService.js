import { db } from "../firebase";
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  deleteDoc, 
  collection, 
  getDocs,
  updateDoc 
} from "firebase/firestore";

const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

let localStream = null;
let peerConnections = new Map();

// Create or get peer connection
export async function createPeerConnection(callId) {
  if (peerConnections.has(callId)) {
    return peerConnections.get(callId);
  }

  const peerConnection = new RTCPeerConnection({
    iceServers,
  });

  // Add local stream tracks
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
  }

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      const candidateRef = doc(
        collection(db, `calls/${callId}/iceCandidates`),
        Math.random().toString()
      );
      await setDoc(candidateRef, {
        candidate: event.candidate.candidate,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        sdpMid: event.candidate.sdpMid,
        timestamp: new Date(),
      });
    }
  };

  peerConnections.set(callId, peerConnection);
  return peerConnection;
}

// Get local media stream
export async function getLocalStream(videoEnabled = true) {
  if (localStream) {
    return localStream;
  }

  try {
    const constraints = {
      audio: true,
      video: videoEnabled ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    };

    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    return localStream;
  } catch (error) {
    console.error("Error accessing media devices:", error);
    throw error;
  }
}

// Create offer
export async function createOffer(callId) {
  const peerConnection = await createPeerConnection(callId, true);
  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });
  await peerConnection.setLocalDescription(offer);
  return offer;
}

// Create answer
export async function createAnswer(callId, offer) {
  const peerConnection = await createPeerConnection(callId, false);
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  return answer;
}

// Set remote description
export async function setRemoteDescription(callId, description) {
  const peerConnection = peerConnections.get(callId);
  if (peerConnection && !peerConnection.remoteDescription) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
  }
}

// Add ICE candidate
export async function addIceCandidate(callId, candidate) {
  const peerConnection = peerConnections.get(callId);
  if (peerConnection && candidate.candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }
}

// Initiate call
export async function initiateCall(callId, callerId, calleeId, calleeDisplayName, videoEnabled = true) {
  try {
    await getLocalStream(videoEnabled);
    const offer = await createOffer(callId);

    const callDoc = {
      callerId,
      calleeId,
      calleeDisplayName,
      offer: {
        type: offer.type,
        sdp: offer.sdp,
      },
      status: "calling",
      startedAt: new Date(),
      videoEnabled,
    };

    await setDoc(doc(db, "calls", callId), callDoc);
  } catch (error) {
    console.error("Error initiating call:", error);
    throw error;
  }
}

// Accept call
export async function acceptCall(callId, offer, videoEnabled = true) {
  try {
    await getLocalStream(videoEnabled);
    const answer = await createAnswer(callId, offer);

    const callRef = doc(db, "calls", callId);
    await updateDoc(callRef, {
      answer: {
        type: answer.type,
        sdp: answer.sdp,
      },
      status: "connected",
      connectedAt: new Date(),
    });
  } catch (error) {
    console.error("Error accepting call:", error);
    throw error;
  }
}

// Reject call
export async function rejectCall(callId) {
  try {
    await updateDoc(doc(db, "calls", callId), {
      status: "rejected",
      endedAt: new Date(),
    });
    closePeerConnection(callId);
  } catch (error) {
    console.error("Error rejecting call:", error);
  }
}

// End call
export async function endCall(callId) {
  try {
    await updateDoc(doc(db, "calls", callId), {
      status: "ended",
      endedAt: new Date(),
    });
    closePeerConnection(callId);
  } catch (error) {
    console.error("Error ending call:", error);
  }
}

// Close peer connection
export function closePeerConnection(callId) {
  const peerConnection = peerConnections.get(callId);
  if (peerConnection) {
    peerConnection.close();
    peerConnections.delete(callId);
  }
}

// Subscribe to call events
export function subscribeToCall(callId, callback) {
  const callRef = doc(db, "calls", callId);
  return onSnapshot(callRef, (snapshot) => {
    const data = snapshot.data();
    callback(data);
  });
}

// Subscribe to ICE candidates
export function subscribeToIceCandidates(callId, callback) {
  const candidatesRef = collection(db, `calls/${callId}/iceCandidates`);
  return onSnapshot(candidatesRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const candidate = change.doc.data();
        callback({
          candidate: candidate.candidate,
          sdpMLineIndex: candidate.sdpMLineIndex,
          sdpMid: candidate.sdpMid,
        });
      }
    });
  });
}

// Get remote stream
export function getRemoteStream(callId) {
  const peerConnection = peerConnections.get(callId);
  if (peerConnection) {
    const streams = peerConnection.getRemoteStreams();
    return streams[0];
  }
  return null;
}

// Get local stream element
export function getLocalStream_Element() {
  return localStream;
}

// Toggle video
export async function toggleVideo(callId, enabled) {
  if (callId && localStream) {
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }
}

// Toggle audio
export async function toggleAudio(callId, enabled) {
  if (callId && localStream) {
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }
}

// Stop all streams
export function stopAllStreams() {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  peerConnections.forEach((pc) => pc.close());
  peerConnections.clear();
}

// Generate unique call ID
export function generateCallId(userId1, userId2) {
  const ids = [userId1, userId2].sort();
  return `${ids[0]}_${ids[1]}_${Date.now()}`;
}

// Clean up call from Firestore
export async function cleanupCall(callId) {
  try {
    const callRef = doc(db, "calls", callId);
    const candidatesRef = collection(db, `calls/${callId}/iceCandidates`);
    
    // Delete all ICE candidates
    const candidates = await getDocs(candidatesRef);
    candidates.forEach(async (candidate) => {
      await deleteDoc(candidate.ref);
    });
    
    // Delete call document
    await deleteDoc(callRef);
  } catch (error) {
    console.error("Error cleaning up call:", error);
  }
}

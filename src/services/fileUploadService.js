import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../firebase";

const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  audio: 20 * 1024 * 1024,
  document: 50 * 1024 * 1024,
  voice: 10 * 1024 * 1024,
};

const ALLOWED_TYPES = {
  image: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
  video: ["video/mp4", "video/quicktime", "video/webm"],
  audio: ["audio/mpeg", "audio/wav", "audio/mp4", "audio/aac", "audio/m4a"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "application/zip",
    "application/x-zip-compressed",
    "application/rar",
    "application/vnd.android.package-archive",
  ],
  voice: ["audio/webm", "audio/mp4", "audio/mpeg"],
};

export function getFileCategory(mimeType) {
  if (ALLOWED_TYPES.image.includes(mimeType)) return "image";
  if (ALLOWED_TYPES.video.includes(mimeType)) return "video";
  if (ALLOWED_TYPES.audio.includes(mimeType)) return "audio";
  if (ALLOWED_TYPES.document.includes(mimeType)) return "document";
  if (ALLOWED_TYPES.voice.includes(mimeType)) return "voice";
  return "unknown";
}

export function validateFile(file, category = null) {
  const cat = category || getFileCategory(file.type);
  if (cat === "unknown") return { valid: false, error: "File type not supported" };

  const sizeLimit = FILE_SIZE_LIMITS[cat];
  if (file.size > sizeLimit) {
    const sizeMB = (sizeLimit / (1024 * 1024)).toFixed(0);
    return { valid: false, error: `File size exceeds ${sizeMB}MB limit` };
  }
  return { valid: true };
}

export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Upload a file to Firebase Storage with progress tracking.
 * Callers must pass a path WITHOUT the 'chat-files/' prefix.
 *
 * @param {File} file
 * @param {string} path - e.g. "userId/timestamp-filename.jpg"
 * @param {function} onProgress - (0-100) called as upload progresses
 * @param {function} onSuccess - ({ downloadURL, storagePath, fileName, fileSize, mimeType })
 * @param {function} onError - (Error)
 * @returns {object} uploadTask with .cancel() and .snapshot
 */
export function uploadFile(file, path, onProgress, onSuccess, onError) {
  const TIMEOUT_MS = 60000; // 60s timeout: if no progress for 60s, fail
  const MAX_RETRIES = 3;

  let retryCount = 0;
  let lastProgressTime = Date.now();
  let progressTimer = null;
  let currentUploadTask = null;
  let cancelled = false;

  function startProgressWatchdog() {
    clearProgressWatchdog();
    lastProgressTime = Date.now();
    progressTimer = setInterval(() => {
      if (cancelled) return;
      const elapsed = Date.now() - lastProgressTime;
      if (elapsed > TIMEOUT_MS) {
        console.error(`[uploadFile] Timeout: no progress for ${TIMEOUT_MS}ms`);
        if (currentUploadTask) {
          currentUploadTask.cancel();
        }
        clearProgressWatchdog();
        // Trigger retry or error
        if (retryCount < MAX_RETRIES - 1) {
          retryCount++;
          console.log(`[uploadFile] Retry ${retryCount + 1}/${MAX_RETRIES} after timeout`);
          setTimeout(() => doUpload(), 1000 * retryCount);
        } else {
          const err = new Error("Upload timed out after 60 seconds. Check your network and Firebase Storage rules.");
          err.code = "storage/retry-limit-exceeded";
          if (onError) onError(err);
        }
      }
    }, 2000);
  }

  function clearProgressWatchdog() {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }

  function doUpload() {
    if (cancelled) return;

    try {
      const fullStoragePath = `chat-files/${path}`;
      console.log(`[uploadFile] Upload ${retryCount + 1}/${MAX_RETRIES} to: ${fullStoragePath}`);
      console.log(`[uploadFile] File: ${file.name}, ${(file.size / 1024).toFixed(1)}KB, type: ${file.type}`);

      const fileRef = storageRef(storage, fullStoragePath);
      const metadata = { contentType: file.type || "application/octet-stream" };

      currentUploadTask = uploadBytesResumable(fileRef, file, metadata);

      currentUploadTask.on(
        "state_changed",
        (snapshot) => {
          lastProgressTime = Date.now();
          const pct = snapshot.totalBytes > 0
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
          console.log(`[uploadFile] Progress: ${pct}% (${snapshot.bytesTransferred}/${snapshot.totalBytes})`);
          if (onProgress) onProgress(pct);
        },
        (error) => {
          clearProgressWatchdog();
          console.error(`[uploadFile] Error (attempt ${retryCount + 1}):`, error.code, error.message);
          
          // Build a user-friendly error message
          let userMsg = error.message || "Upload failed";
          if (error.code === "storage/unauthorized") {
            userMsg = "Upload rejected by Firebase Storage rules. Update rules to allow authenticated users to write to chat-files/.";
          } else if (error.code === "storage/canceled") {
            userMsg = "Upload was cancelled.";
          }

          if (retryCount < MAX_RETRIES - 1 && isRetryable(error)) {
            retryCount++;
            const delay = 1000 * Math.pow(2, retryCount - 1);
            console.log(`[uploadFile] Retry ${retryCount + 1}/${MAX_RETRIES} in ${delay}ms`);
            setTimeout(() => doUpload(), delay);
          } else {
            const enhanced = new Error(userMsg);
            enhanced.originalError = error;
            enhanced.code = error.code;
            if (onError) onError(enhanced);
          }
        },
        async () => {
          clearProgressWatchdog();
          if (cancelled) return;
          try {
            console.log(`[uploadFile] Upload finished, getting download URL...`);
            const downloadURL = await getDownloadURL(currentUploadTask.snapshot.ref);
            console.log(`[uploadFile] Got download URL: ${downloadURL.substring(0, 60)}...`);
            if (onSuccess) {
              onSuccess({
                downloadURL,
                storagePath: fullStoragePath,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
              });
            }
          } catch (err) {
            console.error("[uploadFile] getDownloadURL failed:", err);
            if (onError) onError(err);
          }
        }
      );

      startProgressWatchdog();
    } catch (err) {
      clearProgressWatchdog();
      console.error("[uploadFile] Fatal error:", err);
      if (onError) onError(err);
    }
  }

  doUpload();

  // Return a control object
  return {
    cancel() {
      cancelled = true;
      clearProgressWatchdog();
      if (currentUploadTask) currentUploadTask.cancel();
    },
  };
}

function isRetryable(error) {
  if (!error || !error.code) return false;
  const nonRetryable = [
    "storage/object-not-found",
    "storage/bucket-not-found",
    "storage/project-not-found",
    "storage/quota-exceeded",
    "storage/invalid-checksum",
    "storage/canceled",
    "storage/unauthorized",
  ];
  return !nonRetryable.includes(error.code);
}

export async function deleteFile(storagePath) {
  try {
    const fileRef = storageRef(storage, storagePath);
    await deleteObject(fileRef);
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}

export async function compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (maxHeight / height) * width;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: file.type, lastModified: Date.now() }));
            } else {
              reject(new Error("Image compression failed"));
            }
          },
          file.type,
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

export function getFileIcon(mimeType, fileName) {
  const ext = fileName.split(".").pop().toLowerCase();
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  const iconMap = {
    pdf: "📄", doc: "📝", docx: "📝", ppt: "📊", pptx: "📊",
    xls: "📈", xlsx: "📈", txt: "📃", zip: "📦", rar: "📦", apk: "📱",
  };
  return iconMap[ext] || "📎";
}
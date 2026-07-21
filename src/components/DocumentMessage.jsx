import { formatFileSize, getFileIcon } from "../services/fileUploadService";

export default function DocumentMessage({ fileName, fileSize, downloadUrl, mimeType, onDownload }) {
  const handleDownload = () => {
    if (onDownload) {
      onDownload(downloadUrl, fileName);
    } else {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      link.click();
    }
  };

  const handleOpen = () => {
    window.open(downloadUrl, "_blank");
  };

  return (
    <div className="document-message">
      <div className="document-icon">
        <span>{getFileIcon(mimeType, fileName)}</span>
      </div>
      <div className="document-info">
        <p className="document-name">{fileName}</p>
        <p className="document-size">{formatFileSize(fileSize)}</p>
      </div>
      <div className="document-actions">
        <button className="document-action-button" onClick={handleDownload} title="Download">
          ⬇️
        </button>
        <button className="document-action-button" onClick={handleOpen} title="Open">
          🔗
        </button>
      </div>
    </div>
  );
}

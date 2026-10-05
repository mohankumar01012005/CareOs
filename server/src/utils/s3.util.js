const crypto = require("crypto");
const path = require("path");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

/**
 * AWS Region and Storage Configuration
 */
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_DOCUMENT_BUCKET =
  process.env.S3_DOCUMENT_BUCKET || "careos-documents-production-ap-south-1";
const KMS_KEY_ID = process.env.KMS_KEY_ID || undefined;
const MAX_DOCUMENT_FILE_SIZE_BYTES =
  (Number(process.env.MAX_DOCUMENT_FILE_SIZE_MB) || 15) * 1024 * 1024;
const DEFAULT_PRESIGNED_URL_EXPIRES_SECONDS =
  Number(process.env.PRESIGNED_URL_EXPIRES_SECONDS) || 300;
const EMERGENCY_PRESIGNED_URL_EXPIRES_SECONDS =
  Number(process.env.EMERGENCY_PRESIGNED_URL_EXPIRES_SECONDS) || 900;

/**
 * S3 Client initialization
 * On EC2 with IAM instance profile, AWS SDK automatically retrieves credentials from IMDSv2.
 */
const s3Client = new S3Client({
  region: AWS_REGION,
});

/**
 * Allowed MIME Types & Extensions
 */
const ALLOWED_MIME_EXTENSIONS_MAP = Object.freeze({
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/jpg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "text/plain": [".txt"],
});

const ALLOWED_EXTENSIONS = Object.freeze([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
]);

const BLOCKED_EXTENSIONS = Object.freeze([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".js",
  ".vbs",
  ".php",
  ".py",
  ".html",
  ".htm",
  ".svg",
  ".jar",
  ".msi",
  ".dll",
  ".bin",
  ".com",
  ".scr",
]);

/**
 * Sanitize a filename to prevent path traversal, control characters, and dangerous chars
 */
const sanitizeFileName = (rawFileName = "document") => {
  if (typeof rawFileName !== "string" || !rawFileName.trim()) {
    return "document";
  }

  // Extract base filename without directory components
  const baseName = path.basename(rawFileName).trim();
  const ext = path.extname(baseName).toLowerCase();
  const nameWithoutExt = path.basename(baseName, ext);

  // Replace spaces and invalid chars with underscores
  const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, "");

  return `${safeName || "document"}${safeExt}`;
};

/**
 * Generate secure hierarchical S3 object key
 * Format: circles/{circleId}/recipients/{recipientId}/documents/{docId}/{random16Hex}-{sanitizedFileName}
 */
const buildS3ObjectKey = ({
  circleId,
  recipientId,
  docId,
  originalFileName,
}) => {
  const safeFileName = sanitizeFileName(originalFileName);
  const randomPrefix = crypto.randomBytes(8).toString("hex");
  const circleKey = String(circleId);
  const recipientKey = recipientId ? String(recipientId) : "general";
  const docKey = String(docId);

  return `circles/${circleKey}/recipients/${recipientKey}/documents/${docKey}/${randomPrefix}-${safeFileName}`;
};

/**
 * Validate file magic numbers (file signature inspection)
 */
const checkMagicBytes = (buffer, extension) => {
  if (!buffer || buffer.length < 4) return false;

  const ext = extension.toLowerCase();

  // PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (ext === ".pdf") {
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  }

  // JPEG: 0xFF 0xD8 0xFF
  if (ext === ".jpg" || ext === ".jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG: 0x89 0x50 0x4E 0x47
  if (ext === ".png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }

  // DOCX / XLSX: ZIP header PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (ext === ".docx" || ext === ".xlsx") {
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    );
  }

  // Legacy DOC / XLS: OLE header 0xD0 0xCF 0x11 0xE0
  if (ext === ".doc" || ext === ".xls") {
    return (
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0
    );
  }

  // Plain Text: verify printable or standard UTF-8 characters
  if (ext === ".txt") {
    // Check first 512 bytes for null bytes (indicators of binary executable)
    const inspectLength = Math.min(buffer.length, 512);
    for (let i = 0; i < inspectLength; i++) {
      if (buffer[i] === 0x00) return false;
    }
    return true;
  }

  return false;
};

/**
 * Full server-authoritative file validation
 */
const validateFileForUpload = (file) => {
  if (!file || !file.buffer) {
    return {
      isValid: false,
      code: "EMPTY_FILE",
      message: "No file content was received.",
    };
  }

  if (file.buffer.length === 0 || file.size === 0) {
    return {
      isValid: false,
      code: "EMPTY_FILE",
      message: "File is empty (0 bytes). Please upload a valid document.",
    };
  }

  if (file.buffer.length > MAX_DOCUMENT_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      code: "FILE_TOO_LARGE",
      message: `File size exceeds the maximum allowed limit of ${
        MAX_DOCUMENT_FILE_SIZE_BYTES / (1024 * 1024)
      }MB.`,
    };
  }

  const rawExt = path.extname(file.originalname || "").toLowerCase();

  // Check against prohibited executable/script extensions
  if (BLOCKED_EXTENSIONS.includes(rawExt)) {
    return {
      isValid: false,
      code: "DANGEROUS_FILE_TYPE",
      message: `Files with extension '${rawExt}' are strictly prohibited for security reasons.`,
    };
  }

  // Check allowlist
  if (!ALLOWED_EXTENSIONS.includes(rawExt)) {
    return {
      isValid: false,
      code: "UNSUPPORTED_FILE_TYPE",
      message: `File extension '${rawExt}' is not supported. Allowed extensions: ${ALLOWED_EXTENSIONS.join(
        ", "
      )}`,
    };
  }

  // Check magic bytes / content inspection
  const hasValidMagicBytes = checkMagicBytes(file.buffer, rawExt);
  if (!hasValidMagicBytes) {
    return {
      isValid: false,
      code: "CORRUPTED_OR_DISGUISED_FILE",
      message:
        "File signature does not match its declared format. The file may be corrupted or disguised.",
    };
  }

  // Resolve canonical MIME type
  let canonicalMime = file.mimetype;
  if (!canonicalMime || canonicalMime === "application/octet-stream") {
    for (const [mime, exts] of Object.entries(ALLOWED_MIME_EXTENSIONS_MAP)) {
      if (exts.includes(rawExt)) {
        canonicalMime = mime;
        break;
      }
    }
  }

  return {
    isValid: true,
    fileSize: file.buffer.length,
    extension: rawExt,
    mimeType: canonicalMime || "application/octet-stream",
    sanitizedFileName: sanitizeFileName(file.originalname),
  };
};

/**
 * Upload file buffer directly to S3 with SSE-KMS encryption
 */
const uploadFileToS3 = async ({
  bucket = S3_DOCUMENT_BUCKET,
  key,
  buffer,
  contentType,
  metadata = {},
  kmsKeyId = KMS_KEY_ID,
}) => {
  if (process.env.USE_MOCK_S3 === "true") {
    return {
      bucket,
      key,
      versionId: "mock-v1-" + Date.now(),
      eTag: crypto.createHash("md5").update(buffer).digest("hex"),
      serverSideEncryption: "aws:kms",
    };
  }

  const putParams = {
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType || "application/octet-stream",
    ServerSideEncryption: "aws:kms",
    BucketKeyEnabled: true,
    Metadata: {
      ...metadata,
      uploadedAt: new Date().toISOString(),
    },
  };

  if (kmsKeyId) {
    putParams.SSEKMSKeyId = kmsKeyId;
  }

  const command = new PutObjectCommand(putParams);
  const response = await s3Client.send(command);

  return {
    bucket,
    key,
    versionId: response.VersionId || null,
    eTag: response.ETag ? response.ETag.replace(/"/g, "") : null,
    serverSideEncryption: response.ServerSideEncryption || "aws:kms",
  };
};

/**
 * Generate short-lived presigned GET URL for authorized downloads
 */
const getPresignedDownloadUrl = async ({
  bucket = S3_DOCUMENT_BUCKET,
  key,
  expiresInSeconds = DEFAULT_PRESIGNED_URL_EXPIRES_SECONDS,
  originalFileName,
  contentType,
  isInline = false,
}) => {
  const safeFileName = sanitizeFileName(originalFileName || path.basename(key));

  if (process.env.USE_MOCK_S3 === "true") {
    const mockSignature = crypto.randomBytes(16).toString("hex");
    return {
      downloadUrl: `https://${bucket}.s3.${AWS_REGION}.amazonaws.com/${key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=${expiresInSeconds}&X-Amz-Signature=${mockSignature}`,
      expiresInSeconds,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      fileName: safeFileName,
    };
  }

  const getParams = {
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: isInline
      ? `inline; filename="${safeFileName}"`
      : `attachment; filename="${safeFileName}"`,
  };

  if (contentType) {
    getParams.ResponseContentType = contentType;
  }

  const command = new GetObjectCommand(getParams);
  const downloadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: expiresInSeconds,
  });

  return {
    downloadUrl,
    expiresInSeconds,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    fileName: safeFileName,
  };
};

/**
 * Delete an object from S3
 */
const deleteFileFromS3 = async ({ bucket = S3_DOCUMENT_BUCKET, key }) => {
  if (!key) return { deleted: false };

  if (process.env.USE_MOCK_S3 === "true") {
    return { deleted: true, bucket, key };
  }

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3Client.send(command);
  return { deleted: true, bucket, key };
};

/**
 * Check if object exists in S3
 */
const checkFileExistsInS3 = async ({ bucket = S3_DOCUMENT_BUCKET, key }) => {
  if (process.env.USE_MOCK_S3 === "true") {
    return {
      exists: true,
      contentLength: 1024,
      contentType: "application/pdf",
      lastModified: new Date(),
    };
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const response = await s3Client.send(command);
    return {
      exists: true,
      contentLength: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
    };
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    throw err;
  }
};

module.exports = {
  s3Client,
  S3_DOCUMENT_BUCKET,
  AWS_REGION,
  KMS_KEY_ID,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  DEFAULT_PRESIGNED_URL_EXPIRES_SECONDS,
  EMERGENCY_PRESIGNED_URL_EXPIRES_SECONDS,
  ALLOWED_EXTENSIONS,
  BLOCKED_EXTENSIONS,
  sanitizeFileName,
  buildS3ObjectKey,
  checkMagicBytes,
  validateFileForUpload,
  uploadFileToS3,
  getPresignedDownloadUrl,
  deleteFileFromS3,
  checkFileExistsInS3,
};

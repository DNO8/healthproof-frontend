export function isPdfFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const mime = file.type.toLowerCase();
  return ext === "pdf" && mime === "application/pdf";
}

export function isUploadableFile(file: File): boolean {
  if (isPdfFile(file)) return true;
  const mime = file.type.toLowerCase();
  return (
    mime.startsWith("image/") &&
    ["image/jpeg", "image/png", "image/webp", "image/bmp"].includes(mime)
  );
}

export function isPdfFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const mime = file.type.toLowerCase();
  return ext === "pdf" && mime === "application/pdf";
}

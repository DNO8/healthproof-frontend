import {
  User,
  Stethoscope,
  FlaskConical,
  Shield,
  Share2,
  FileText,
  ScanLine,
  Upload,
  ClipboardList,
  FolderOpen,
  Settings,
  Clock,
  FileX,
  ShieldOff,
  ClipboardX,
  Inbox,
  X,
  ArrowRight,
  Building2,
  type LucideIcon,
} from "lucide-react";

export const ROLE_ICONS: Record<string, LucideIcon> = {
  patient: User,
  doctor: Stethoscope,
  lab: FlaskConical,
  institution: Building2,
  certifier: Shield,
  admin: Shield,
};

export const ACTION_ICONS: Record<string, LucideIcon> = {
  "share-results": Share2,
  "my-documents": FileText,
  "my-orders": ClipboardList,
  "upload-results": Upload,
  "scan-qr": ScanLine,
  "pending-orders": Clock,
  "create-order": ClipboardList,
  "manage-episodes": FolderOpen,
  "admin-panel": Settings,
};

export const EMPTY_STATE_ICONS: Record<string, LucideIcon> = {
  documents: FileX,
  permissions: ShieldOff,
  orders: ClipboardX,
  episodes: FolderOpen,
  default: Inbox,
};

export { X, ArrowRight };

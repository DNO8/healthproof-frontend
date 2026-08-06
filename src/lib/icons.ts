import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ClipboardList,
  ClipboardX,
  Clock,
  FileText,
  FileX,
  FlaskConical,
  FolderOpen,
  Inbox,
  type LucideIcon,
  ScanLine,
  Settings,
  Share2,
  Shield,
  ShieldOff,
  Stethoscope,
  Upload,
  User,
  X,
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
  "emergency-access": AlertTriangle,
};

export const EMPTY_STATE_ICONS: Record<string, LucideIcon> = {
  documents: FileX,
  permissions: ShieldOff,
  orders: ClipboardX,
  episodes: FolderOpen,
  default: Inbox,
};

export { X, ArrowRight };

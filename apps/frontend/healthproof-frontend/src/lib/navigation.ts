import type { UserRole } from "@/types/domain.types";

export interface SidebarLink {
  id: string;
  labelKey: string;
  icon: string;
  href: string;
}

export const LINKS_BY_ROLE: Record<UserRole, SidebarLink[]> = {
  patient: [
    {
      id: "overview",
      labelKey: "overview",
      icon: "LayoutDashboard",
      href: "/dashboard/overview",
    },
    {
      id: "my-orders",
      labelKey: "myOrders",
      icon: "ClipboardList",
      href: "/dashboard/my-orders",
    },
    {
      id: "documents",
      labelKey: "documents",
      icon: "FileText",
      href: "/dashboard/documents",
    },
    {
      id: "permissions",
      labelKey: "permissions",
      icon: "Shield",
      href: "/dashboard/permissions",
    },
    {
      id: "guardians",
      labelKey: "guardians",
      icon: "User",
      href: "/dashboard/guardians",
    },
    {
      id: "invitations",
      labelKey: "invitations",
      icon: "Mail",
      href: "/dashboard/invitations",
    },
    {
      id: "share",
      labelKey: "share",
      icon: "Share2",
      href: "/dashboard/share",
    },
  ],
  doctor: [
    {
      id: "overview",
      labelKey: "overview",
      icon: "LayoutDashboard",
      href: "/dashboard/overview",
    },
    {
      id: "orders",
      labelKey: "orders",
      icon: "ClipboardList",
      href: "/dashboard/orders",
    },
    {
      id: "episodes",
      labelKey: "episodes",
      icon: "FolderOpen",
      href: "/dashboard/episodes",
    },
    {
      id: "shared",
      labelKey: "shared",
      icon: "FolderOpen",
      href: "/dashboard/shared",
    },
    {
      id: "invitations",
      labelKey: "invitations",
      icon: "Mail",
      href: "/dashboard/invitations",
    },
    { id: "scan", labelKey: "scan", icon: "ScanLine", href: "/dashboard/scan" },
  ],
  lab: [
    {
      id: "overview",
      labelKey: "overview",
      icon: "LayoutDashboard",
      href: "/dashboard/overview",
    },
    {
      id: "lab-orders",
      labelKey: "labOrders",
      icon: "ClipboardList",
      href: "/dashboard/lab-orders",
    },
    {
      id: "upload",
      labelKey: "upload",
      icon: "Upload",
      href: "/dashboard/upload",
    },
    {
      id: "invitations",
      labelKey: "invitations",
      icon: "Mail",
      href: "/dashboard/invitations",
    },
    { id: "scan", labelKey: "scan", icon: "ScanLine", href: "/dashboard/scan" },
  ],
  institution: [
    {
      id: "overview",
      labelKey: "overview",
      icon: "LayoutDashboard",
      href: "/dashboard/overview",
    },
    {
      id: "networks",
      labelKey: "networks",
      icon: "Globe",
      href: "/dashboard/networks",
    },
    {
      id: "invitations",
      labelKey: "invitations",
      icon: "Mail",
      href: "/dashboard/invitations",
    },
  ],
  certifier: [
    {
      id: "overview",
      labelKey: "overview",
      icon: "LayoutDashboard",
      href: "/dashboard/overview",
    },
    {
      id: "entities",
      labelKey: "entities",
      icon: "Building2",
      href: "/dashboard/entities",
    },
    {
      id: "invitations",
      labelKey: "invitations",
      icon: "Mail",
      href: "/dashboard/invitations",
    },
  ],
  admin: [
    {
      id: "overview",
      labelKey: "overview",
      icon: "LayoutDashboard",
      href: "/dashboard/overview",
    },
    {
      id: "entities",
      labelKey: "entities",
      icon: "Building2",
      href: "/dashboard/entities",
    },
    {
      id: "networks",
      labelKey: "networks",
      icon: "Globe",
      href: "/dashboard/networks",
    },
    {
      id: "invitations",
      labelKey: "invitations",
      icon: "Mail",
      href: "/dashboard/invitations",
    },
    {
      id: "kernel",
      labelKey: "kernel",
      icon: "Settings",
      href: "/dashboard/kernel",
    },
    {
      id: "protocol",
      labelKey: "protocol",
      icon: "Lock",
      href: "/dashboard/protocol",
    },
  ],
};

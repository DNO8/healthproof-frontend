import type { UserRole } from "@/types/domain.types";

export interface SidebarLink {
  id: string;
  labelKey: string;
  icon: string;
  href: string;
}

export const LINKS_BY_ROLE: Record<UserRole, SidebarLink[]> = {
  patient: [
    { id: "overview", labelKey: "overview", icon: "📊", href: "/dashboard/overview" },
    { id: "my-orders", labelKey: "myOrders", icon: "📋", href: "/dashboard/my-orders" },
    { id: "documents", labelKey: "documents", icon: "📄", href: "/dashboard/documents" },
    { id: "permissions", labelKey: "permissions", icon: "🔐", href: "/dashboard/permissions" },
    { id: "guardians", labelKey: "guardians", icon: "👤", href: "/dashboard/guardians" },
    { id: "share", labelKey: "share", icon: "📤", href: "/dashboard/share" },
  ],
  doctor: [
    { id: "overview", labelKey: "overview", icon: "📊", href: "/dashboard/overview" },
    { id: "orders", labelKey: "orders", icon: "📝", href: "/dashboard/orders" },
    { id: "episodes", labelKey: "episodes", icon: "🏥", href: "/dashboard/episodes" },
    { id: "shared", labelKey: "shared", icon: "📂", href: "/dashboard/shared" },
    { id: "scan", labelKey: "scan", icon: "📷", href: "/dashboard/scan" },
  ],
  lab: [
    { id: "overview", labelKey: "overview", icon: "📊", href: "/dashboard/overview" },
    { id: "lab-orders", labelKey: "labOrders", icon: "📋", href: "/dashboard/lab-orders" },
    { id: "upload", labelKey: "upload", icon: "📤", href: "/dashboard/upload" },
    { id: "scan", labelKey: "scan", icon: "📷", href: "/dashboard/scan" },
  ],
  institution: [
    { id: "overview", labelKey: "overview", icon: "📊", href: "/dashboard/overview" },
    { id: "networks", labelKey: "networks", icon: "🌐", href: "/dashboard/networks" },
  ],
  certifier: [
    { id: "overview", labelKey: "overview", icon: "📊", href: "/dashboard/overview" },
    { id: "entities", labelKey: "entities", icon: "🧑‍⚕️", href: "/dashboard/entities" },
  ],
  admin: [
    { id: "overview", labelKey: "overview", icon: "📊", href: "/dashboard/overview" },
    { id: "entities", labelKey: "entities", icon: "🧑‍⚕️", href: "/dashboard/entities" },
    { id: "networks", labelKey: "networks", icon: "🌐", href: "/dashboard/networks" },
    { id: "kernel", labelKey: "kernel", icon: "⚙️", href: "/dashboard/kernel" },
    { id: "protocol", labelKey: "protocol", icon: "🔒", href: "/dashboard/protocol" },
  ],
};

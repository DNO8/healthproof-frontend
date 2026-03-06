export type UserRole = "patient" | "laboratory" | "medical_center";

export type RoleConfig = {
  key: UserRole;
  label: string;
  description: string;
  icon: string;
};

export const ROLES: RoleConfig[] = [
  {
    key: "patient",
    label: "Patient",
    description:
      "Sovereignty over your medical history. Delegate access via QR.",
    icon: "🩺",
  },
  {
    key: "laboratory",
    label: "Laboratory",
    description: "Issue verifiable clinical evidence and test results.",
    icon: "🔬",
  },
  {
    key: "medical_center",
    label: "Medical Center",
    description: "Validate results and manage medical orders.",
    icon: "🏥",
  },
];

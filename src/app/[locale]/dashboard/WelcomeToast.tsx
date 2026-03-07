"use client";

import { useEffect } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";

const WELCOME_KEY = "hp_welcome_shown";

export function WelcomeToast({
  email,
  roleLabel,
}: {
  email: string;
  roleLabel: string;
}) {
  const t = useTranslations("dashboard");

  useEffect(() => {
    if (sessionStorage.getItem(WELCOME_KEY)) return;
    sessionStorage.setItem(WELCOME_KEY, "1");

    sileo.success({
      title: t("welcomeToast", { role: roleLabel }),
      description: t("signedInAs", { email }),
      duration: 4000,
    });
  }, [email, roleLabel, t]);

  return null;
}

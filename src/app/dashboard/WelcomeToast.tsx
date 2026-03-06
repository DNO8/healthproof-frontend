"use client";

import { useEffect } from "react";
import { sileo } from "sileo";

const WELCOME_KEY = "hp_welcome_shown";

export function WelcomeToast({
  email,
  roleLabel,
}: {
  email: string;
  roleLabel: string;
}) {
  useEffect(() => {
    if (sessionStorage.getItem(WELCOME_KEY)) return;
    sessionStorage.setItem(WELCOME_KEY, "1");

    sileo.success({
      title: `Welcome, ${roleLabel}`,
      description: `Signed in as ${email}`,
      duration: 4000,
    });
  }, [email, roleLabel]);

  return null;
}

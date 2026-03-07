"use client";

import { useRef, useTransition } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { sendContactEmail } from "./actions";

export function ContactForm() {
  const t = useTranslations("contact");
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;

    const data = new FormData(form);
    const name = (data.get("name") as string)?.trim();
    const email = (data.get("email") as string)?.trim();
    const subject = (data.get("subject") as string)?.trim();
    const message = (data.get("message") as string)?.trim();

    if (!name) {
      sileo.warning({
        title: t("nameRequired"),
        description: t("nameRequiredDesc"),
      });
      return;
    }

    if (!email) {
      sileo.warning({
        title: t("emailRequired"),
        description: t("emailRequiredDesc"),
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sileo.warning({
        title: t("invalidEmail"),
        description: t("invalidEmailDesc"),
      });
      return;
    }

    if (!subject) {
      sileo.warning({
        title: t("subjectRequired"),
        description: t("subjectRequiredDesc"),
      });
      return;
    }

    if (!message) {
      sileo.warning({
        title: t("messageRequired"),
        description: t("messageRequiredDesc"),
      });
      return;
    }

    sileo.info({
      title: t("sendingMessage"),
      description: t("sendingMessageDesc"),
      duration: 2000,
    });

    startTransition(async () => {
      const result = await sendContactEmail(data);

      if (result?.error) {
        sileo.error({
          title: t("failedToSend"),
          description: result.error,
        });
        return;
      }

      if (result?.success) {
        sileo.success({
          title: t("messageSent"),
          description: t("messageSentDesc"),
          duration: 5000,
        });
        form.reset();
      }
    });
  }

  return (
    <form className="mt-10 space-y-6" onSubmit={handleSubmit} ref={formRef}>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-slate-700"
            htmlFor="name"
          >
            {t("nameLabel")}
          </label>
          <input
            className="neu-inset w-full rounded-xl px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:neu-focus-ring"
            id="name"
            name="name"
            placeholder={t("namePlaceholder")}
            type="text"
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-slate-700"
            htmlFor="email"
          >
            {t("emailLabel")}
          </label>
          <input
            className="neu-inset w-full rounded-xl px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:neu-focus-ring"
            id="email"
            name="email"
            placeholder={t("emailPlaceholder")}
            type="email"
          />
        </div>
      </div>

      <div>
        <label
          className="mb-1.5 block text-xs font-medium text-slate-700"
          htmlFor="subject"
        >
          {t("subjectLabel")}
        </label>
        <input
          className="neu-inset w-full rounded-xl px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:neu-focus-ring"
          id="subject"
          name="subject"
          placeholder={t("subjectPlaceholder")}
          type="text"
        />
      </div>

      <div>
        <label
          className="mb-1.5 block text-xs font-medium text-slate-700"
          htmlFor="message"
        >
          {t("messageLabel")}
        </label>
        <textarea
          className="neu-inset w-full resize-none rounded-xl px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:neu-focus-ring"
          id="message"
          name="message"
          placeholder={t("messagePlaceholder")}
          rows={5}
        />
      </div>

      <button
        className="rounded-2xl border border-white/60 bg-(--hp-primary) px-8 py-3 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) active:translate-y-px disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? t("sending") : t("send")}
      </button>
    </form>
  );
}

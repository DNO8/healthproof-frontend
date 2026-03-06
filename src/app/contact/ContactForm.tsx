"use client";

import { useRef } from "react";
import { sileo } from "sileo";

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);

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
        title: "Name required",
        description: "Please enter your name.",
      });
      return;
    }

    if (!email) {
      sileo.warning({
        title: "Email required",
        description: "Please enter a valid email address.",
      });
      return;
    }

    if (!subject) {
      sileo.warning({
        title: "Subject required",
        description: "Please enter a subject for your message.",
      });
      return;
    }

    if (!message) {
      sileo.warning({
        title: "Message required",
        description: "Please write your message before sending.",
      });
      return;
    }

    sileo.success({
      title: "Message sent",
      description:
        "Thank you for reaching out! Our team will get back to you shortly.",
      duration: 5000,
    });

    form.reset();
  }

  return (
    <form className="mt-10 space-y-6" onSubmit={handleSubmit} ref={formRef}>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-slate-700"
            htmlFor="name"
          >
            Name
          </label>
          <input
            className="neu-inset w-full rounded-xl px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:neu-focus-ring"
            id="name"
            name="name"
            placeholder="Your name"
            type="text"
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-slate-700"
            htmlFor="email"
          >
            Email
          </label>
          <input
            className="neu-inset w-full rounded-xl px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:neu-focus-ring"
            id="email"
            name="email"
            placeholder="you@example.com"
            type="email"
          />
        </div>
      </div>

      <div>
        <label
          className="mb-1.5 block text-xs font-medium text-slate-700"
          htmlFor="subject"
        >
          Subject
        </label>
        <input
          className="neu-inset w-full rounded-xl px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:neu-focus-ring"
          id="subject"
          name="subject"
          placeholder="What is this about?"
          type="text"
        />
      </div>

      <div>
        <label
          className="mb-1.5 block text-xs font-medium text-slate-700"
          htmlFor="message"
        >
          Message
        </label>
        <textarea
          className="neu-inset w-full resize-none rounded-xl px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:neu-focus-ring"
          id="message"
          name="message"
          placeholder="Tell us more..."
          rows={5}
        />
      </div>

      <button
        className="rounded-2xl border border-white/60 bg-(--hp-primary) px-8 py-3 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) active:translate-y-px"
        type="submit"
      >
        Send message
      </button>
    </form>
  );
}

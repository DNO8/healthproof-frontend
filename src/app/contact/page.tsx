import type { Metadata } from "next";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact — HealthProof",
  description: "Get in touch with the HealthProof team",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="neu-shell border border-white/70 p-8 sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">
          Contact
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
          Get in touch
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
          Have a question about HealthProof, want to explore a partnership, or
          need technical details? Reach out and our team will respond shortly.
        </p>

        <ContactForm />
      </div>
    </main>
  );
}

import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Nav } from "@/components/layout/Nav";
import { MobileSheet } from "@/components/layout/MobileSheet";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { routing } from "@/i18n/routing";
import { Providers } from "../providers";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <NextIntlClientProvider locale={locale}>
      <Providers>
        <ToastProvider />
        <Nav />
        <MobileSheet />
        {children}
      </Providers>
    </NextIntlClientProvider>
  );
}

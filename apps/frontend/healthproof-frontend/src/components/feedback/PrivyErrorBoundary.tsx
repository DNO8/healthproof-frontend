"use client";

import { Component, type ReactNode } from "react";
import { useTranslations } from "next-intl";

interface ErrorBoundaryMessages {
  privyTitle: string;
  privyDesc: string;
  privyStepsTitle: string;
  step1: string;
  step2: string;
  step3: string;
  step4: string;
  step5: string;
  genericTitle: string;
  genericDesc: string;
}

interface Props {
  children: ReactNode;
  messages: ErrorBoundaryMessages;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class PrivyErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[PrivyErrorBoundary] caught error:", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      const isPrivyOriginError =
        this.state.error?.message?.includes("Origin not allowed") ?? false;
      const m = this.props.messages;
      const origin = typeof window !== "undefined" ? window.location.origin : "localhost";

      if (isPrivyOriginError) {
        return (
          <div className="mx-auto max-w-md px-4 py-12 text-center">
            <h1 className="mb-4 text-xl font-bold text-slate-800">{m.privyTitle}</h1>
            <p className="mb-6 text-sm text-slate-600">
              {m.privyDesc.split("{{origin}}")[0]}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">{origin}</code>
              {m.privyDesc.split("{{origin}}")[1] ?? ""}
            </p>
            <div className="rounded-xl bg-sky-50 p-4 text-left text-xs text-sky-800">
              <p className="mb-2 font-semibold">{m.privyStepsTitle}</p>
              <ol className="ml-4 list-decimal space-y-1">
                <li>{m.step1}</li>
                <li>{m.step2}</li>
                <li>{m.step3}</li>
                <li>{m.step4}</li>
                <li>{m.step5}</li>
              </ol>
            </div>
          </div>
        );
      }

      return (
        <div className="mx-auto max-w-md px-4 py-12 text-center">
          <h1 className="mb-4 text-xl font-bold text-slate-800">{m.genericTitle}</h1>
          <p className="mb-4 text-sm text-slate-600">{m.genericDesc}</p>
          <pre className="max-h-48 overflow-auto rounded-xl bg-red-50 p-3 text-xs text-red-700">
            {this.state.error?.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export function PrivyErrorBoundary({ children }: { children: ReactNode }) {
  const t = useTranslations("privyError");
  const messages: ErrorBoundaryMessages = {
    privyTitle: t("privyTitle"),
    privyDesc: t("privyDesc"),
    privyStepsTitle: t("privyStepsTitle"),
    step1: t("step1"),
    step2: t("step2"),
    step3: t("step3"),
    step4: t("step4"),
    step5: t("step5"),
    genericTitle: t("genericTitle"),
    genericDesc: t("genericDesc"),
  };

  return (
    <PrivyErrorBoundaryClass messages={messages}>
      {children}
    </PrivyErrorBoundaryClass>
  );
}

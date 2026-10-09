"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pending: pendingText = "Working…",
  className = "btn",
  confirm: confirmText,
  busy,
}: {
  children: React.ReactNode;
  pending?: string;
  className?: string;
  confirm?: string;
  /** Pending flag for forms not submitted through the `action` prop. */
  busy?: boolean;
}) {
  const status = useFormStatus();
  const pending = busy ?? status.pending;
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: { error?: string; ok?: string } }) {
  if (state.error) return <p className="rounded-md bg-warn/10 px-3 py-2 text-sm text-warn">{state.error}</p>;
  if (state.ok) return <p className="rounded-md bg-ok/10 px-3 py-2 text-sm text-ok">{state.ok}</p>;
  return null;
}

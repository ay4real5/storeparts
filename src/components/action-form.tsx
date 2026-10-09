"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { FormMessage, SubmitButton } from "./form-status";

type State = { error?: string; ok?: string };

/**
 * A form bound to a server action that returns { error } or { ok }.
 * Submitted manually rather than via the `action` prop so React doesn't wipe
 * the fields when the action fails; the form is cleared only on success, and
 * only when `resetOnSuccess` is set.
 */
export function ActionForm({
  action,
  submit,
  pending,
  className = "space-y-3",
  buttonClass,
  confirm,
  resetOnSuccess = false,
  children,
}: {
  action: (prev: State, form: FormData) => Promise<State>;
  submit: string;
  pending?: string;
  className?: string;
  buttonClass?: string;
  confirm?: string;
  resetOnSuccess?: boolean;
  children?: React.ReactNode;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.ok) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      {children}
      <FormMessage state={state} />
      <SubmitButton pending={pending} className={buttonClass} confirm={confirm} busy={isPending}>
        {submit}
      </SubmitButton>
    </form>
  );
}

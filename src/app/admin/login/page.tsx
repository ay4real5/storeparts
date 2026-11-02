import type { Metadata } from "next";
import { login } from "../actions";
import { ActionForm } from "@/components/action-form";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-surface-2 px-4 py-16">
      <div aria-hidden className="absolute inset-y-0 right-0 hidden w-[calc(50%+22px)] bg-accent/10 [clip-path:polygon(90px_0,100%_0,100%_100%,0_100%)] lg:block" />
      <div aria-hidden className="absolute inset-y-0 right-0 hidden w-1/2 bg-accent [clip-path:polygon(90px_0,100%_0,100%_100%,0_100%)] lg:block" />
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-white p-6 sm:p-8">
        <Logo />
        <h1 className="display mt-6 text-xl">Store administration</h1>
        <p className="mt-1 text-sm text-muted">Sign in to manage your store.</p>
        <ActionForm action={login} submit="Sign in" pending="Signing in…" className="mt-6 space-y-4" buttonClass="btn w-full">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" className="input" required autoComplete="username" />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
          </div>
        </ActionForm>
      </div>
    </main>
  );
}

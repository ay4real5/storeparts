import type { Metadata } from "next";
import { login } from "../actions";
import { ActionForm } from "@/components/action-form";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-accent px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo inverse />
        </div>
        <div className="rounded-xl bg-white p-6 sm:p-8">
          <h1 className="display text-xl">Store administration</h1>
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
      </div>
    </main>
  );
}

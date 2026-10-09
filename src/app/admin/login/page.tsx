import type { Metadata } from "next";
import { login } from "../actions";
import { ActionForm } from "@/components/action-form";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-center text-2xl font-bold">Store admin</h1>
        <ActionForm action={login} submit="Sign in" pending="Signing in…" className="card space-y-4 p-6" buttonClass="btn w-full">
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

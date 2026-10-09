import type { Metadata } from "next";
import { BarChart3, Lock, PackageCheck, RotateCcw, Truck } from "lucide-react";
import { login } from "../actions";
import { ActionForm } from "@/components/action-form";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen flex-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_30%_40%,black,transparent_75%)]" />
        <div className="absolute -top-32 -left-24 h-[480px] w-[480px] rounded-full bg-accent/35 blur-[120px]" />
        <div className="absolute right-0 -bottom-40 h-[380px] w-[380px] rounded-full bg-[#3b82f6]/20 blur-[120px]" />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative mt-auto max-w-md">
          <p className="display text-sm text-accent">Store admin</p>
          <h1 className="display mt-2 text-6xl leading-[0.95]">
            Run the shop.
            <br />
            <span className="text-white/40">From one place.</span>
          </h1>
          <ul className="mt-10 space-y-4">
            {[
              [BarChart3, "Revenue, low stock and orders to ship at a glance"],
              [Truck, "Buy and print shipping labels in one click"],
              [RotateCcw, "Approve returns and refund core deposits"],
              [PackageCheck, "Manage products, photos and vehicle fitment"],
            ].map(([Icon, text]) => {
              const I = Icon as typeof Truck;
              return (
                <li key={text as string} className="flex items-center gap-3 text-white/75">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                    <I className="h-4 w-4 text-accent" />
                  </span>
                  {text as string}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Form */}
      <section className="flex items-center justify-center bg-background px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logo light={false} />
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Lock className="h-6 w-6" />
          </span>
          <h2 className="display mt-5 text-4xl">Welcome back</h2>
          <p className="mt-1 text-muted">Sign in to manage your store.</p>
          <ActionForm action={login} submit="Sign in" pending="Signing in…" className="mt-8 space-y-5" buttonClass="btn w-full py-3 text-base">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input id="email" name="email" type="email" className="input py-3" required autoComplete="username" />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input id="password" name="password" type="password" className="input py-3" required autoComplete="current-password" />
            </div>
          </ActionForm>
        </div>
      </section>
    </main>
  );
}

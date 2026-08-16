"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrow } from "@/components/Icons";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "login" ? { email, password } : { email, password, name, agreeTos: agree }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "something went wrong");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      {mode === "signup" && (
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-fog">Name (or channel name)</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Winslow"
            className="mt-1.5 w-full rounded-xl border border-line bg-ink-900 px-4 py-2.5 text-sm outline-none focus:border-brand/50"
          />
        </label>
      )}
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-fog">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="mt-1.5 w-full rounded-xl border border-line bg-ink-900 px-4 py-2.5 text-sm outline-none focus:border-brand/50"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-fog">Password</span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
          className="mt-1.5 w-full rounded-xl border border-line bg-ink-900 px-4 py-2.5 text-sm outline-none focus:border-brand/50"
        />
      </label>
      {mode === "signup" && (
        <label className="flex items-start gap-2.5 text-sm text-fog">
          <input
            type="checkbox"
            required
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-line bg-ink-900 accent-[#19e57f]"
          />
          <span>
            I agree to the{" "}
            <a href="/terms" target="_blank" className="text-chalk underline hover:text-brand">Terms of Service</a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" className="text-chalk underline hover:text-brand">Privacy Policy</a>.
          </span>
        </label>
      )}
      {error && <p className="text-sm text-magenta-soft">{error}</p>}
      <button
        type="submit"
        disabled={busy || (mode === "signup" && !agree)}
        className="btn-primary w-full py-3 disabled:opacity-50"
      >
        {busy ? "One sec…" : mode === "login" ? "Sign in" : "Create my workspace"}{" "}
        {!busy && <IconArrow className="h-4 w-4" />}
      </button>
    </form>
  );
}

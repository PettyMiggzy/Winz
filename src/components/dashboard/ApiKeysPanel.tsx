"use client";

import { useEffect, useState } from "react";

interface KeyRow {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

/** Manage developer API keys (create shows the secret once; revoke anytime). */
export function ApiKeysPanel() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      if (res.ok) setKeys(data.keys ?? []);
    } catch {
      /* leave list as-is */
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "API key" }),
      });
      const data = await res.json();
      if (res.ok) {
        setFreshKey(data.key);
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    await fetch(`/api/keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold">API keys</h3>
          <p className="mt-0.5 text-sm text-fog">
            Build on WinClipz — submit videos and fetch clips programmatically.{" "}
            <a href="/developers" target="_blank" className="text-brand hover:underline">
              API docs →
            </a>
          </p>
        </div>
        <button onClick={create} disabled={busy} className="btn-primary disabled:opacity-50">
          {busy ? "Creating…" : "Create key"}
        </button>
      </div>

      {freshKey && (
        <div className="mt-4 rounded-xl border border-brand/30 bg-brand/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            Your new key — copy it now, it won&apos;t be shown again
          </p>
          <code className="mt-2 block select-all break-all rounded-lg bg-ink-950 px-3 py-2 text-sm text-chalk">
            {freshKey}
          </code>
        </div>
      )}

      {keys.length > 0 && (
        <ul className="mt-4 divide-y divide-line/60">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between py-2.5 text-sm">
              <span className="font-medium">{k.name}</span>
              <span className="flex items-center gap-4">
                <span className="text-xs text-fog">
                  {k.lastUsedAt ? "used recently" : "never used"}
                </span>
                <button onClick={() => revoke(k.id)} className="text-xs text-magenta-soft hover:underline">
                  Revoke
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

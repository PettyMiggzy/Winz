"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { IconBolt, IconArrow, IconCheck, IconScissors } from "@/components/Icons";

type Status = "idle" | "submitting" | "queued" | "error";

type Mode = "file" | "link";

export function UploadForm() {
  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [styleHint, setStyleHint] = useState("Kick streamer — gaming + IRL reactions");
  const [layout, setLayout] = useState<"crop" | "blurpad">("crop");
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submitLink = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStatus("submitting");
    setMsg("");
    try {
      const res = await fetch("/api/uploads/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, styleHint, layout }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "couldn't queue that link");
      setMsg(data.note ?? "Queued — pulling the video and cutting your clips.");
      setStatus("queued");
    } catch (e) {
      setStatus("error");
      setMsg(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  const pick = (f: File | null | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setStatus("error");
      setMsg("That's not a video file.");
      return;
    }
    setFile(f);
    setStatus("idle");
    setMsg("");
  };

  const submit = async () => {
    if (!file) return;
    setStatus("submitting");
    setMsg("");
    try {
      const res = await fetch("/api/uploads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, styleHint, layout }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "upload failed");

      if (data.uploadUrl) {
        // Upload straight to R2, then mark the stream queued for the worker.
        const put = await fetch(data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "video/mp4" },
          body: file,
        });
        if (!put.ok) throw new Error(`upload to storage failed (${put.status})`);
        await fetch(`/api/uploads/${data.streamId}/complete`, { method: "POST" });
        setMsg("Queued — the engine will cut, title, and caption your clips.");
      } else {
        setMsg(data.note ?? "Queued — the engine will cut, title, and caption your clips.");
      }
      setStatus("queued");
    } catch (e) {
      setStatus("error");
      setMsg(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  if (status === "queued") {
    return (
      <div className="card grid place-items-center py-16 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-brand/15 text-brand">
          <IconCheck className="h-6 w-6" />
        </div>
        <p className="mt-4 text-lg font-bold">
          &ldquo;{mode === "file" ? file?.name : url.trim()}&rdquo; is in the engine
        </p>
        <p className="mt-1 max-w-md text-sm text-fog">{msg}</p>
        <div className="mt-6 flex gap-3">
          <Link href="/dashboard/review" className="btn-primary">
            Go to review queue <IconArrow className="h-4 w-4" />
          </Link>
          <button
            onClick={() => { setFile(null); setUrl(""); setStatus("idle"); setMsg(""); }}
            className="btn-ghost"
          >
            Add another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5">
        {/* Mode toggle: paste a link or upload a file */}
        <div className="flex gap-1 rounded-xl border border-line bg-ink-900 p-1">
          {([["link", "Paste a link"], ["file", "Upload a file"]] as const).map(([v, t]) => (
            <button
              key={v}
              onClick={() => { setMode(v); setStatus("idle"); setMsg(""); }}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                mode === v ? "bg-brand/15 text-brand" : "text-fog hover:text-chalk"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {mode === "link" ? (
          /* Link input */
          <div className="card space-y-3 p-5">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-fog">
                Video link — YouTube, Kick, Twitch…
              </span>
              <input
                value={url}
                onChange={(e) => { setUrl(e.target.value); setStatus("idle"); setMsg(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") submitLink(); }}
                placeholder="https://kick.com/…  or  https://youtube.com/watch?v=…"
                className="mt-1.5 w-full rounded-xl border border-line bg-ink-900 px-4 py-2.5 text-sm outline-none focus:border-brand/50"
              />
            </label>
            <p className="text-xs text-fog">
              We pull the video server-side and cut it — no downloading needed. Only
              submit content you own or have permission to use.
            </p>
          </div>
        ) : (
          /* Dropzone */
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
            onClick={() => inputRef.current?.click()}
            className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
              drag ? "border-brand/60 bg-brand/5" : "border-line bg-ink-850/60 hover:border-brand/30"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-ink-800 text-brand">
              <IconScissors className="h-6 w-6" />
            </div>
            {file ? (
              <>
                <p className="mt-4 font-semibold">{file.name}</p>
                <p className="mt-1 text-xs text-fog">{(file.size / 1_000_000).toFixed(1)} MB · click to change</p>
              </>
            ) : (
              <>
                <p className="mt-4 font-semibold">Drop a video, or click to choose</p>
                <p className="mt-1 text-sm text-fog">A stream VOD or a YouTube export — MP4/MOV. We find the best moments.</p>
              </>
            )}
          </div>
        )}

        {/* Options */}
        <div className="card space-y-4 p-5">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-fog">Style hint (steers the AI)</span>
            <input
              value={styleHint}
              onChange={(e) => setStyleHint(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-ink-900 px-4 py-2.5 text-sm outline-none focus:border-brand/50"
            />
          </label>
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-fog">Layout</span>
            <div className="mt-1.5 flex gap-2">
              {([["crop", "Center crop", "facecam / IRL"], ["blurpad", "Blurred pad", "gameplay"]] as const).map(([v, t, d]) => (
                <button
                  key={v}
                  onClick={() => setLayout(v)}
                  className={`flex-1 rounded-xl border p-3 text-left transition-colors ${layout === v ? "border-brand/50 bg-brand/10" : "border-line bg-ink-900 hover:border-line/80"}`}
                >
                  <span className="block text-sm font-semibold">{t}</span>
                  <span className="block text-xs text-fog">{d}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {status === "error" && <p className="text-sm text-magenta-soft">{msg}</p>}

        <button
          onClick={mode === "link" ? submitLink : submit}
          disabled={(mode === "link" ? !url.trim() : !file) || status === "submitting"}
          className="btn-primary px-6 py-3 text-base disabled:opacity-40"
        >
          {status === "submitting" ? "Queuing…" : <>Clip it <IconBolt className="h-4 w-4" /></>}
        </button>
      </div>

      {/* Explainer */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-fog">What happens next</p>
          <ol className="mt-3 space-y-3 text-sm">
            {[
              "Transcribe + read audio energy and chat spikes",
              "AI picks the best moments and writes each hook",
              "Renders 9:16 with word-by-word captions",
              "Clips land in your review queue to approve",
            ].map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink-800 text-[11px] font-bold text-brand">{i + 1}</span>
                <span className="text-chalk/90">{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-line pt-4 text-xs text-fog">
            Got Winslow&apos;s YouTube back-catalog? Download a few from YouTube Studio
            and drop them here — no need to wait for a live stream.
          </p>
        </div>
      </div>
    </div>
  );
}

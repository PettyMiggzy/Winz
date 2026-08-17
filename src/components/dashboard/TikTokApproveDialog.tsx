"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck } from "@/components/Icons";

/**
 * TikTok-compliant approval dialog. TikTok's Content Sharing Guidelines
 * require: privacy selected manually from a dropdown with NO pre-selected
 * default, interaction toggles visible, the destination account identified,
 * and an explicit consent action per post. Approval is blocked until a privacy
 * level is chosen.
 */

export interface TikTokPostOptions {
  privacyLevel: string;
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
  brandContent: boolean;
  brandOrganic: boolean;
  isAiGenerated: boolean;
}

const PRIVACY_OPTIONS = [
  { value: "PUBLIC_TO_EVERYONE", label: "Public — everyone can watch" },
  { value: "MUTUAL_FOLLOW_FRIENDS", label: "Friends — mutual follows only" },
  { value: "FOLLOWER_OF_CREATOR", label: "Followers only" },
  { value: "SELF_ONLY", label: "Private — only me" },
] as const;

export function TikTokApproveDialog({
  clipTitle,
  accountHandles,
  onConfirm,
  onCancel,
}: {
  clipTitle: string;
  /** Every TikTok account this approval will post to. */
  accountHandles: string[];
  onConfirm: (opts: TikTokPostOptions) => void;
  onCancel: () => void;
}) {
  // Deliberately empty — TikTok requires the user to pick, not a default.
  const [privacy, setPrivacy] = useState<string>("");
  const [disableComment, setDisableComment] = useState(false);
  const [disableDuet, setDisableDuet] = useState(false);
  const [disableStitch, setDisableStitch] = useState(false);
  const [brandContent, setBrandContent] = useState(false);
  const [brandOrganic, setBrandOrganic] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);

  const selectRef = useRef<HTMLSelectElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus the privacy select on open; close on Escape; basic focus trap.
  useEffect(() => {
    selectRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); return; }
      if (e.key === "Tab" && dialogRef.current) {
        const f = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, select, input, [tabindex]:not([tabindex="-1"])'
        );
        if (f.length === 0) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // TikTok forbids branded content on private posts — clear SELF_ONLY if it's
  // selected when branded content is turned on.
  const privacyOptions = brandContent
    ? PRIVACY_OPTIONS.filter((o) => o.value !== "SELF_ONLY")
    : PRIVACY_OPTIONS;
  useEffect(() => {
    if (brandContent && privacy === "SELF_ONLY") setPrivacy("");
  }, [brandContent, privacy]);

  const targets =
    accountHandles.length === 1
      ? `@${accountHandles[0]}`
      : accountHandles.map((h) => `@${h}`).join(", ");

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tiktok-approve-title"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-line bg-ink-900 p-6 shadow-2xl"
      >
        <h3 id="tiktok-approve-title" className="text-lg font-bold">Post to TikTok</h3>
        <p className="mt-1 text-sm text-fog">
          &ldquo;{clipTitle}&rdquo; will be posted to{" "}
          <span className="font-semibold text-chalk">{targets}</span>
          {accountHandles.length > 1 && (
            <span> ({accountHandles.length} accounts, staggered)</span>
          )}
          .
        </p>

        <label className="mt-5 block">
          <span className="text-xs font-medium uppercase tracking-wide text-fog">
            Who can watch this video? <span className="text-magenta-soft">*</span>
          </span>
          <select
            ref={selectRef}
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-ink-950 px-3.5 py-2.5 text-sm outline-none focus:border-brand/50"
          >
            <option value="" disabled>
              Select privacy…
            </option>
            {privacyOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4 space-y-2.5">
          {(
            [
              ["Disable comments", disableComment, setDisableComment],
              ["Disable Duet", disableDuet, setDisableDuet],
              ["Disable Stitch", disableStitch, setDisableStitch],
              ["Branded content (paid partnership)", brandContent, setBrandContent],
              ["Promotes my own brand/business", brandOrganic, setBrandOrganic],
              ["AI-generated content", isAiGenerated, setIsAiGenerated],
            ] as const
          ).map(([label, val, set]) => (
            <label key={label} className="flex items-center gap-2.5 text-sm text-chalk/90">
              <input
                type="checkbox"
                checked={val}
                onChange={(e) => set(e.target.checked)}
                className="h-4 w-4 rounded border-line bg-ink-950 accent-[#19e57f]"
              />
              {label}
            </label>
          ))}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-fog">
          By posting, you confirm this content complies with TikTok&apos;s Community
          Guidelines{brandContent ? " and Branded Content Policy" : ""} and that you
          have the rights to share it.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() =>
              onConfirm({
                privacyLevel: privacy,
                disableComment,
                disableDuet,
                disableStitch,
                brandContent,
                brandOrganic,
                isAiGenerated,
              })
            }
            disabled={!privacy}
            className="btn-primary flex-1 disabled:opacity-40"
          >
            <IconCheck className="h-4 w-4" /> Post to TikTok
          </button>
          <button onClick={onCancel} className="btn-ghost flex-1">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

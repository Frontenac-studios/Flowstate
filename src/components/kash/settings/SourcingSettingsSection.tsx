"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import Button from "@/components/kash/ui/Button";
import Checkbox from "@/components/kash/ui/Checkbox";
import Input from "@/components/kash/ui/Input";
import Select from "@/components/kash/ui/Select";
import Textarea from "@/components/kash/ui/Textarea";
import { useOptionalToast } from "@/components/kash/ui/ToastProvider";
import { DEFAULT_VOICE, DEFAULT_WEIGHTS } from "@/lib/sourcing/constants";
import { DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE, MIN_BATCH_SIZE } from "@/lib/sourcing/run";
import type {
  EnrichmentMode,
  OutreachVoice,
  SourcingSegment,
  SourcingWeights,
} from "@/lib/sourcing/types";
import { useTRPC } from "@/trpc/client";

const MAX_SEGMENTS = 3;

/**
 * ICP + outreach-voice config for the sourcing agent (W10b). The scoring brain
 * (W10c) reads this. Auto-seeds from the user's Directions / won clients / Targets /
 * rate when unconfigured, so the form is never a blank slate. Gated behind
 * FLAGS.sourcing by the caller (SettingsForm), so it's dark until W10 is whole.
 */
export default function SourcingSettingsSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const toast = useOptionalToast();

  const { data: settings } = useQuery(trpc.sourcing.getSettings.queryOptions());
  const { data: seed } = useQuery(trpc.sourcing.getSeedSuggestion.queryOptions());
  // Which segments the agent keeps failing to learn enough about — the evidence a
  // paid data vendor would be answering, shown next to the switch that would buy one.
  const { data: health = [] } = useQuery(trpc.sourcing.confidenceHealth.queryOptions());
  const healthBySegment = useMemo(() => new Map(health.map((h) => [h.segmentId, h])), [health]);

  const [segments, setSegments] = useState<SourcingSegment[]>([]);
  const [exclusionsText, setExclusionsText] = useState("");
  const [weights, setWeights] = useState<SourcingWeights>(DEFAULT_WEIGHTS);
  const [voice, setVoice] = useState<OutreachVoice>(DEFAULT_VOICE);
  const [weeklyRunEnabled, setWeeklyRunEnabled] = useState(false);
  const [batchSize, setBatchSize] = useState(DEFAULT_BATCH_SIZE);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once: from saved config if present, else prefill from the seed suggestion.
  useEffect(() => {
    if (hydrated || settings === undefined) return;
    // The run switch and batch size hydrate whether or not an ICP is configured —
    // they are not part of "have you set up your ICP yet".
    setWeeklyRunEnabled(settings.weeklyRunEnabled);
    setBatchSize(settings.weeklyRunBatchSize);
    if (settings.configured && settings.segments) {
      setSegments(settings.segments);
      setExclusionsText((settings.exclusions ?? []).join("\n"));
      setWeights(settings.weights ?? DEFAULT_WEIGHTS);
      setVoice(settings.outreachVoice ?? DEFAULT_VOICE);
      setHydrated(true);
    } else if (seed) {
      setSegments(seed.segments);
      setWeights(seed.weights);
      setVoice(seed.outreachVoice);
      setHydrated(true);
    }
  }, [settings, seed, hydrated]);

  const save = useMutation(
    trpc.sourcing.updateSettings.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.sourcing.getSettings.pathFilter());
        toast?.toast({ message: "Sourcing settings saved." });
      },
    })
  );

  function updateSegment(id: string, patch: Partial<SourcingSegment>) {
    setSegments((s) => s.map((seg) => (seg.id === id ? { ...seg, ...patch } : seg)));
  }

  function addSegment() {
    if (segments.length >= MAX_SEGMENTS) return;
    setSegments((s) => [
      ...s,
      { id: `seg-${Date.now()}`, label: `Segment ${s.length + 1}`, firmographics: "" },
    ]);
  }

  function submit() {
    save.mutate({
      segments,
      exclusions: exclusionsText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      weights,
      outreachVoice: voice,
      weeklyRunEnabled,
      weeklyRunBatchSize: batchSize,
    });
  }

  const setWeight = (k: keyof SourcingWeights, v: number) =>
    setWeights((w) => ({ ...w, [k]: Number.isFinite(v) ? v : 0 }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-body font-medium text-ink">Sourcing — your ICP</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Who the sourcing agent should look for, and how it should sound. Prefilled from your
          Directions and clients — edit it to taste.
        </p>
      </div>

      {/* Segments */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-ink">Ideal-customer segments</h3>
          <span className="text-caption text-ink-muted">
            {segments.length} of {MAX_SEGMENTS}
          </span>
        </div>
        {segments.map((seg) => (
          <div key={seg.id} className="flex flex-col gap-2 rounded-card border border-subtle p-3">
            <div className="flex items-center gap-2">
              <Input
                aria-label="Segment label"
                value={seg.label}
                onChange={(e) => updateSegment(seg.id, { label: e.target.value })}
                className="max-w-[14rem] text-sm"
              />
              {segments.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setSegments((s) => s.filter((x) => x.id !== seg.id))}
                  className="text-caption text-ink-muted transition hover:text-critical"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <Textarea
              aria-label="Firmographics"
              value={seg.firmographics}
              onChange={(e) => updateSegment(seg.id, { firmographics: e.target.value })}
              placeholder="Industry, size/stage, geography, buying signals…"
              rows={3}
              className="text-sm"
            />

            {/* W10j — gap-filling, per segment, with the evidence for it alongside. */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-caption text-ink-muted">
                Gap-filling
                <Select
                  aria-label={`Gap-filling for ${seg.label}`}
                  value={seg.enrichment ?? "off"}
                  onChange={(e) =>
                    updateSegment(seg.id, { enrichment: e.target.value as EnrichmentMode })
                  }
                  className="py-1 text-sm"
                >
                  <option value="off">Off</option>
                  <option value="web">One extra web search (~8¢)</option>
                </Select>
              </label>
              {healthBySegment.get(seg.id)?.chronicallyLow ? (
                <span className="text-caption text-ink">
                  Averaging {healthBySegment.get(seg.id)!.meanConfidence}% confidence over{" "}
                  {healthBySegment.get(seg.id)!.scored} prospects — this segment is the one worth
                  gap-filling.
                </span>
              ) : healthBySegment.get(seg.id) ? (
                <span className="text-caption text-ink-faint">
                  {healthBySegment.get(seg.id)!.meanConfidence}% mean confidence over{" "}
                  {healthBySegment.get(seg.id)!.scored} prospects.
                </span>
              ) : null}
            </div>
          </div>
        ))}
        {segments.length < MAX_SEGMENTS ? (
          <button
            type="button"
            onClick={addSegment}
            className="self-start text-caption font-medium text-ink-muted transition hover:text-ink"
          >
            ＋ Add a segment
          </button>
        ) : null}
      </section>

      {/* Exclusions */}
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-ink">Exclusions</h3>
        <p className="text-caption text-ink-muted">One rule per line — never surface these.</p>
        <Textarea
          aria-label="Exclusions"
          value={exclusionsText}
          onChange={(e) => setExclusionsText(e.target.value)}
          placeholder={"agencies\ndesign-only work\ncompanies under 5 people"}
          rows={3}
          className="text-sm"
        />
      </section>

      {/* Weights */}
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-ink">Scoring weights</h3>
        <p className="text-caption text-ink-muted">
          Score = won-similarity vs explicit criteria; the explicit half splits across Fit (fit) /
          Need (buying signals) / Value (willingness-to-pay). The agent scores facts — it never
          judges.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(
            [
              ["wonSimilarity", "Won-similarity"],
              ["explicit", "Explicit"],
              ["fit", "Fit"],
              ["need", "Need"],
              ["value", "Value"],
            ] as [keyof SourcingWeights, string][]
          ).map(([key, label]) => (
            <label key={key} className="flex flex-col gap-1 text-caption text-ink-muted">
              {label}
              <Input
                type="number"
                min={0}
                max={100}
                value={weights[key]}
                onChange={(e) => setWeight(key, parseInt(e.target.value, 10))}
                className="text-sm"
              />
            </label>
          ))}
        </div>
      </section>

      {/* The weekly run — the only control here that spends money on its own. */}
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-ink">Weekly sourcing</h3>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={weeklyRunEnabled}
            onChange={(e) => setWeeklyRunEnabled(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-sm text-ink">
            Source new prospects every Tuesday
            <span className="mt-0.5 block text-caption text-ink-muted">
              The agent searches the web against your ICP, then researches and scores what it finds
              — unattended, and it costs about 35¢ a prospect. Off by default. You can always run a
              batch by hand from the Pipeline board instead.
            </span>
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm text-ink-muted">
          Prospects per run
          <input
            type="number"
            min={MIN_BATCH_SIZE}
            max={MAX_BATCH_SIZE}
            value={batchSize}
            onChange={(e) =>
              setBatchSize(Number.parseInt(e.target.value, 10) || DEFAULT_BATCH_SIZE)
            }
            className="w-16 rounded-control border border-subtle bg-surface px-2 py-1 text-sm text-ink"
          />
        </label>
      </section>

      {/* Outreach voice */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-ink">Outreach voice</h3>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-caption text-ink-muted">
            Warmth
            <Select
              value={voice.warmth}
              onChange={(e) =>
                setVoice((v) => ({ ...v, warmth: e.target.value as OutreachVoice["warmth"] }))
              }
              className="text-sm"
            >
              <option value="warm">Warm</option>
              <option value="professional">Professional</option>
              <option value="formal">Formal</option>
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-caption text-ink-muted">
            Length
            <Select
              value={voice.length}
              onChange={(e) =>
                setVoice((v) => ({ ...v, length: e.target.value as OutreachVoice["length"] }))
              }
              className="text-sm"
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
            </Select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <Checkbox
            checked={voice.citeAnalogousClient}
            onChange={(e) => setVoice((v) => ({ ...v, citeAnalogousClient: e.target.checked }))}
          />
          Cite an analogous won client in the opener
        </label>
        <Input
          aria-label="Signature"
          value={voice.signature}
          onChange={(e) => setVoice((v) => ({ ...v, signature: e.target.value }))}
          placeholder="Signature (e.g. Kat, Frontenac Studios)"
          className="text-sm"
        />
        <Textarea
          aria-label="Voice sample"
          value={voice.voiceSample}
          onChange={(e) => setVoice((v) => ({ ...v, voiceSample: e.target.value }))}
          placeholder="Paste a message you've written — the agent mirrors its cadence and phrasing."
          rows={4}
          className="text-sm"
        />
      </section>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={submit} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save sourcing settings"}
        </Button>
        {seed ? (
          <button
            type="button"
            onClick={() => {
              setSegments(seed.segments);
              setWeights(seed.weights);
              setVoice(seed.outreachVoice);
            }}
            className="text-caption font-medium text-ink-muted transition hover:text-ink"
          >
            Reset to suggestion
          </button>
        ) : null}
      </div>
    </div>
  );
}

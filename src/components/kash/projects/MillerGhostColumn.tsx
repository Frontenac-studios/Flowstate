const GHOST_ROWS = [0.7, 0.5, 0.6];

export default function MillerGhostColumn() {
  return (
    <div
      aria-hidden
      className="pointer-events-none flex w-64 shrink-0 select-none flex-col gap-0.5 rounded-kash border border-dashed border-white/40 p-2 opacity-60"
    >
      {GHOST_ROWS.map((width, index) => (
        <div key={index} className="flex items-center gap-2 px-2 py-1.5">
          <span className="bg-kash-ink-muted/15 h-3.5 w-3.5 shrink-0 rounded-sm" />
          <span
            className="bg-kash-ink-muted/15 h-3 rounded-sm"
            style={{ width: `${width * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}

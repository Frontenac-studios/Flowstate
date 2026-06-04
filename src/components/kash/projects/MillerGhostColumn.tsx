const GHOST_ROWS = [0.7, 0.5, 0.6];

type Props = {
  shellClassName?: string;
};

export default function MillerGhostColumn({
  shellClassName = "w-64 shrink-0 min-h-60 flex h-full min-h-0 flex-col self-stretch",
}: Props) {
  return (
    <div
      aria-hidden
      className={`miller-column-card pointer-events-none flex select-none flex-col gap-0.5 p-2 opacity-60 ${shellClassName}`}
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

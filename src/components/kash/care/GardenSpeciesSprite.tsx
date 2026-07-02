import type { GardenThemeSpecies } from "@/lib/care/garden-species";

type Props = {
  species: GardenThemeSpecies;
  grown: boolean;
  x: number;
  y: number;
};

/** Soft-flat seed/grown plant glyph for one of six garden themes. */
export function GardenSpeciesSprite({ species, grown, x, y }: Props) {
  const stemH = grown ? 28 : 14;
  const leafR = grown ? 9 : 5;
  const hue =
    species === "bloom"
      ? "var(--g-petal-a)"
      : species === "vine"
        ? "var(--g-petal-b)"
        : "var(--g-leaf)";

  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={-stemH}
        stroke="var(--g-stem)"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle cx={-leafR} cy={-stemH + 4} r={leafR} fill={hue} opacity={grown ? 1 : 0.65} />
      {grown ? <circle cx={leafR} cy={-stemH + 8} r={leafR - 2} fill="var(--g-leaf-soft)" /> : null}
      {grown && species === "bloom" ? (
        <circle cx={0} cy={-stemH - 6} r={5} fill="var(--g-flower-core)" />
      ) : null}
    </g>
  );
}

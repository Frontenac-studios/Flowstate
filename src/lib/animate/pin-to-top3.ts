import {
  MOTION_TOKEN,
  motionTransition,
  prefersReducedMotion,
  readMotionDurationMs,
} from "./motion-tokens";

type PinFlightOptions = {
  sourceEl: HTMLElement;
  top3SectionEl: HTMLElement;
  title: string;
  onComplete: () => void;
};

function resolveTargetRect(top3SectionEl: HTMLElement): DOMRect {
  const hintEl = top3SectionEl.querySelector("[data-top3-hint]");
  const lastPinEl = top3SectionEl.querySelector("[data-top3-pin]:last-of-type");

  if (lastPinEl) {
    const pinRect = lastPinEl.getBoundingClientRect();
    const sectionRect = top3SectionEl.getBoundingClientRect();
    return new DOMRect(
      sectionRect.left + 12,
      pinRect.bottom + 8,
      sectionRect.width - 24,
      pinRect.height
    );
  }

  if (hintEl) {
    return hintEl.getBoundingClientRect();
  }

  return top3SectionEl.getBoundingClientRect();
}

export function animatePinToTop3({
  sourceEl,
  top3SectionEl,
  title,
  onComplete,
}: PinFlightOptions): void {
  if (prefersReducedMotion()) {
    onComplete();
    return;
  }

  const durationMs = readMotionDurationMs(MOTION_TOKEN.medium);
  const sourceRect = sourceEl.getBoundingClientRect();
  const targetRect = resolveTargetRect(top3SectionEl);

  const ghost = document.createElement("div");
  ghost.setAttribute("aria-hidden", "true");
  ghost.className =
    "rounded-card border border-subtle bg-surface pointer-events-none fixed z-50 flex items-center gap-2 overflow-hidden px-3 py-2 text-sm text-ink shadow-lg";
  ghost.style.top = `${sourceRect.top}px`;
  ghost.style.left = `${sourceRect.left}px`;
  ghost.style.width = `${sourceRect.width}px`;
  ghost.style.height = `${sourceRect.height}px`;
  ghost.style.transition = motionTransition(["top", "left", "width", "height", "opacity"]);

  const star = document.createElement("span");
  star.className = "shrink-0 text-accent";
  star.textContent = "★";

  const titleEl = document.createElement("span");
  titleEl.className = "min-w-0 flex-1 truncate font-medium";
  titleEl.textContent = title;

  ghost.append(star, titleEl);
  document.body.appendChild(ghost);

  requestAnimationFrame(() => {
    ghost.style.top = `${targetRect.top}px`;
    ghost.style.left = `${targetRect.left}px`;
    ghost.style.width = `${targetRect.width}px`;
    ghost.style.height = `${targetRect.height}px`;
    ghost.style.opacity = "0.85";
  });

  const cleanup = () => {
    ghost.remove();
    onComplete();
  };

  ghost.addEventListener("transitionend", cleanup, { once: true });
  setTimeout(cleanup, durationMs + 50);
}

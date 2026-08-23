import { PROJECT_CATEGORIES, type ProjectCategory } from "../projects/categories";

// Phase 1 (1H / 1.AIb): seed example titles per category. Each category's prototype
// vector is the (normalized) mean of these titles' embeddings, computed once and cached
// by the provider. These are deliberately short and varied — the shape real task titles
// take — so the nearest-prototype match generalizes. Tunable: add examples to sharpen a
// category that mis-classifies; they are plain data, no model needed to edit them.
export const CATEGORY_PROTOTYPE_TITLES: Record<ProjectCategory, string[]> = {
  business: [
    "Ship the onboarding build",
    "Prep slides for the client meeting",
    "Review the pull request",
    "Send the project invoice",
    "Write the quarterly report",
    "Reply to the work email thread",
    "Plan the sprint backlog",
  ],
  personal: [
    "Work on the side project",
    "Practice guitar",
    "Call mom",
    "Plan dinner with friends",
    "Buy a birthday gift for Alex",
    "Go for a run",
    "Book a dentist appointment",
    "Meditate for ten minutes",
    "Pay the electricity bill",
    "Do the grocery shopping",
    "Renew the passport",
  ],
};

/** Flattened (category, title) pairs in category order — the embedding input list. */
export function prototypeTitlePairs(): { category: ProjectCategory; title: string }[] {
  return PROJECT_CATEGORIES.flatMap((category) =>
    CATEGORY_PROTOTYPE_TITLES[category].map((title) => ({ category, title }))
  );
}

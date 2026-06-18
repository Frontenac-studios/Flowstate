import { PROJECT_CATEGORIES, type ProjectCategory } from "../projects/categories";

// Phase 1 (1H / 1.AIb): seed example titles per category. Each category's prototype
// vector is the (normalized) mean of these titles' embeddings, computed once and cached
// by the provider. These are deliberately short and varied — the shape real task titles
// take — so the nearest-prototype match generalizes. Tunable: add examples to sharpen a
// category that mis-classifies; they are plain data, no model needed to edit them.
export const CATEGORY_PROTOTYPE_TITLES: Record<ProjectCategory, string[]> = {
  professional: [
    "Ship the onboarding build",
    "Prep slides for the client meeting",
    "Review the pull request",
    "Send the project invoice",
    "Write the quarterly report",
    "Reply to the work email thread",
    "Plan the sprint backlog",
  ],
  personal_projects: [
    "Work on the side project",
    "Edit the photos from the trip",
    "Write a chapter of the novel",
    "Practice guitar",
    "Build the bookshelf",
    "Sketch ideas for the app",
    "Learn a new recipe",
  ],
  relationships: [
    "Call mom",
    "Text Sarah back",
    "Plan dinner with friends",
    "Buy a birthday gift for Alex",
    "Schedule a catch-up coffee",
    "Write a thank-you card",
    "Visit grandma this weekend",
  ],
  body_mind: [
    "Go for a run",
    "Book a dentist appointment",
    "Meditate for ten minutes",
    "Refill the prescription",
    "Do a yoga session",
    "Schedule the annual checkup",
    "Drink more water today",
  ],
  adulting: [
    "Pay the electricity bill",
    "Renew the car insurance",
    "Do the grocery shopping",
    "File the taxes",
    "Take out the trash",
    "Fix the leaking faucet",
    "Renew the passport",
  ],
};

/** Flattened (category, title) pairs in category order — the embedding input list. */
export function prototypeTitlePairs(): { category: ProjectCategory; title: string }[] {
  return PROJECT_CATEGORIES.flatMap((category) =>
    CATEGORY_PROTOTYPE_TITLES[category].map((title) => ({ category, title }))
  );
}

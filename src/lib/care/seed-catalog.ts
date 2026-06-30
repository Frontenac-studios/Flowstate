import type { SeedPractice } from "./types";

// Static self-care seed catalog (D5 — "Suggested" practices). Pure data; the Adopt
// flow (CL3) copies an entry into care_activities as { source: "suggested",
// catalog_key: key } and the catalog view hides already-adopted keys.
//
// catalog_key scheme: `{theme}_{slug}`. Keys are a forever-stable contract — once
// shipped, never rename one (it would orphan adopted rows / break de-dupe). To
// retire a practice, drop the row; to reword, keep the key and change the title.
//
// cadence is intentionally sparse: only set it where a practice clearly implies a
// rhythm (per kash-3.0-care-q6 Option 3, cadence merely pre-fills a default the user
// overrides on adopt). kind is set only for clear walk/breathe/reflect deep-links.

export const SEED_CATALOG: readonly SeedPractice[] = Object.freeze([
  // 🚶 Move — get the body going.
  {
    key: "move_walk_10",
    title: "10-minute walk",
    theme: "move",
    kind: "walk",
    cadence: "most_days",
  },
  { key: "move_stretch_5", title: "Stretch for 5 minutes", theme: "move" },
  { key: "move_fresh_air", title: "Step outside for fresh air", theme: "move" },
  { key: "move_dance_song", title: "Dance for a full song", theme: "move" },

  // 🌿 Calm — downshift the nervous system.
  {
    key: "calm_breathing_2",
    title: "2 minutes of breathing exercises",
    theme: "calm",
    kind: "breathe",
  },
  { key: "calm_unplug_15", title: "Unplug for 15 minutes", theme: "calm" },
  { key: "calm_visualize_place", title: "Visualize a peaceful place", theme: "calm" },
  { key: "calm_name_feeling", title: "Name how you're feeling right now", theme: "calm" },

  // 💬 Connect — reach toward people.
  { key: "connect_text_friend", title: "Text a friend", theme: "connect" },
  { key: "connect_call_loved", title: "Call someone you love", theme: "connect" },
  { key: "connect_compliment", title: "Give a genuine compliment", theme: "connect" },
  { key: "connect_plan_friend", title: "Plan time with a friend", theme: "connect" },

  // 🌙 Rest — protect recovery.
  { key: "rest_screenfree_hour", title: "Screen-free for the hour before bed", theme: "rest" },
  { key: "rest_braindump", title: "Write down all your thoughts and worries", theme: "rest" },
  {
    key: "rest_sleep_breathing",
    title: "Wind down with 5 minutes of sleep breathing exercises",
    theme: "rest",
    kind: "breathe",
  },
  { key: "rest_last_meal_3h", title: "Eat your last meal 3 hours before bed", theme: "rest" },

  // 🍎 Nourish — basic body upkeep.
  { key: "nourish_water", title: "Drink a glass of water", theme: "nourish" },
  { key: "nourish_real_meal", title: "Eat a real meal", theme: "nourish" },
  { key: "nourish_sunlight_15", title: "Get some sunlight for 15 minutes", theme: "nourish" },
  { key: "nourish_floss", title: "Floss your teeth", theme: "nourish" },

  // 📓 Reflect — light inner check-in.
  {
    key: "reflect_gratitude_3",
    title: "List 3 things you're grateful for",
    theme: "reflect",
    kind: "reflect",
  },
  {
    key: "reflect_self_kindness",
    title: "Say one kind thing to yourself, as if speaking to a friend",
    theme: "reflect",
    kind: "reflect",
  },
  {
    key: "reflect_affirmation_mirror",
    title: "Read an affirmation aloud in the mirror",
    theme: "reflect",
    kind: "reflect",
  },
  {
    key: "reflect_did_well",
    title: "Pause and notice something you did well today",
    theme: "reflect",
    kind: "reflect",
  },
]);

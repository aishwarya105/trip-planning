/* ── Workout library ──────────────────────────────────────────────────────
   Every workout the recommender can pick from lives here.

   These are STARTER workouts so the app works today. They'll be replaced /
   extended with the workouts from your PDFs — each one just needs:

     id        unique slug
     name      display name
     minutes   how long it takes
     intensity 1 = easy/recovery · 2 = moderate · 3 = hard
     type      "strength" | "hiit" | "cardio" | "mobility"
     muscles   which groups it works (keys of MUSCLES below)
     exercises list of { name, detail }
     source    where it came from (e.g. the PDF name)
     for       optional: ["me"] or ["baby"] to show it to only one person
*/

window.MUSCLES = {
  chest:      { label: "Chest",      emoji: "🫁", region: "upper" },
  back:       { label: "Back",       emoji: "🔙", region: "upper" },
  shoulders:  { label: "Shoulders",  emoji: "🤷", region: "upper" },
  arms:       { label: "Arms",       emoji: "💪", region: "upper" },
  core:       { label: "Core",       emoji: "🎯", region: "core"  },
  glutes:     { label: "Glutes",     emoji: "🍑", region: "lower" },
  quads:      { label: "Quads",      emoji: "🦵", region: "lower" },
  hamstrings: { label: "Hamstrings", emoji: "🦿", region: "lower" },
  cardio:     { label: "Cardio",     emoji: "❤️", region: "cardio" },
};

window.WORKOUTS = [
  {
    id: "upper-push-30", name: "Upper Body Push", minutes: 30, intensity: 2, type: "strength",
    muscles: ["chest", "shoulders", "arms"], program: "Starter",
    exercises: [
      { name: "Push-ups", detail: "3 × 10–12" },
      { name: "Dumbbell shoulder press", detail: "3 × 10" },
      { name: "Dumbbell chest press / floor press", detail: "3 × 10" },
      { name: "Lateral raises", detail: "3 × 12" },
      { name: "Tricep dips (chair)", detail: "3 × 10" },
    ],
  },
  {
    id: "upper-pull-30", name: "Upper Body Pull", minutes: 30, intensity: 2, type: "strength",
    muscles: ["back", "arms", "shoulders"], program: "Starter",
    exercises: [
      { name: "Bent-over dumbbell rows", detail: "3 × 10" },
      { name: "Single-arm rows", detail: "3 × 10 each" },
      { name: "Reverse flys", detail: "3 × 12" },
      { name: "Bicep curls", detail: "3 × 12" },
      { name: "Superman holds", detail: "3 × 30s" },
    ],
  },
  {
    id: "lower-strength-40", name: "Lower Body Strength", minutes: 40, intensity: 3, type: "strength",
    muscles: ["quads", "glutes", "hamstrings"], program: "Starter",
    exercises: [
      { name: "Goblet squats", detail: "4 × 10" },
      { name: "Romanian deadlifts", detail: "4 × 10" },
      { name: "Reverse lunges", detail: "3 × 10 each" },
      { name: "Hip thrusts", detail: "3 × 12" },
      { name: "Wall sit", detail: "2 × 45s" },
    ],
  },
  {
    id: "glutes-hams-25", name: "Glutes & Hamstrings", minutes: 25, intensity: 2, type: "strength",
    muscles: ["glutes", "hamstrings"], program: "Starter",
    exercises: [
      { name: "Glute bridges", detail: "3 × 15" },
      { name: "Single-leg RDL", detail: "3 × 8 each" },
      { name: "Donkey kicks", detail: "3 × 15 each" },
      { name: "Fire hydrants", detail: "3 × 12 each" },
      { name: "Hamstring walkouts", detail: "3 × 8" },
    ],
  },
  {
    id: "quads-15", name: "Quick Leg Burner", minutes: 15, intensity: 2, type: "strength",
    muscles: ["quads", "glutes"], program: "Starter",
    exercises: [
      { name: "Bodyweight squats", detail: "3 × 20" },
      { name: "Walking lunges", detail: "3 × 10 each" },
      { name: "Squat pulses", detail: "2 × 30s" },
    ],
  },
  {
    id: "core-15", name: "Core Crusher", minutes: 15, intensity: 2, type: "strength",
    muscles: ["core"], program: "Starter",
    exercises: [
      { name: "Plank", detail: "3 × 45s" },
      { name: "Dead bugs", detail: "3 × 10 each" },
      { name: "Bicycle crunches", detail: "3 × 20" },
      { name: "Side plank", detail: "2 × 30s each" },
    ],
  },
  {
    id: "core-10", name: "10-Min Abs", minutes: 10, intensity: 1, type: "strength",
    muscles: ["core"], program: "Starter",
    exercises: [
      { name: "Crunches", detail: "40s on / 20s off" },
      { name: "Leg raises", detail: "40s on / 20s off" },
      { name: "Russian twists", detail: "40s on / 20s off" },
      { name: "Plank", detail: "40s on / 20s off" },
      { name: "Repeat once", detail: "" },
    ],
  },
  {
    id: "full-body-45", name: "Full Body Strength", minutes: 45, intensity: 3, type: "strength",
    muscles: ["chest", "back", "quads", "glutes", "core", "shoulders"], program: "Starter",
    exercises: [
      { name: "Squats", detail: "3 × 12" },
      { name: "Push-ups", detail: "3 × 10" },
      { name: "Dumbbell rows", detail: "3 × 10 each" },
      { name: "Lunges", detail: "3 × 10 each" },
      { name: "Shoulder press", detail: "3 × 10" },
      { name: "Plank", detail: "3 × 45s" },
    ],
  },
  {
    id: "full-body-20", name: "Express Full Body", minutes: 20, intensity: 2, type: "strength",
    muscles: ["chest", "back", "quads", "core"], program: "Starter",
    exercises: [
      { name: "Circuit × 3: Squats", detail: "12" },
      { name: "Push-ups", detail: "10" },
      { name: "Bent-over rows", detail: "10" },
      { name: "Plank", detail: "30s" },
    ],
  },
  {
    id: "hiit-20", name: "HIIT Sweat", minutes: 20, intensity: 3, type: "hiit",
    muscles: ["cardio", "quads", "core"], program: "Starter",
    exercises: [
      { name: "Jumping jacks", detail: "40s on / 20s off" },
      { name: "Burpees", detail: "40s on / 20s off" },
      { name: "Mountain climbers", detail: "40s on / 20s off" },
      { name: "Jump squats", detail: "40s on / 20s off" },
      { name: "High knees", detail: "40s on / 20s off — 4 rounds" },
    ],
  },
  {
    id: "cardio-30", name: "Steady Cardio", minutes: 30, intensity: 2, type: "cardio",
    muscles: ["cardio"], program: "Starter",
    exercises: [
      { name: "Brisk walk / jog / bike", detail: "30 min, conversational pace" },
    ],
  },
  {
    id: "walk-20", name: "Recovery Walk", minutes: 20, intensity: 1, type: "cardio",
    muscles: ["cardio"], program: "Starter",
    exercises: [{ name: "Easy outdoor walk", detail: "20 min" }],
  },
  {
    id: "mobility-15", name: "Mobility & Stretch", minutes: 15, intensity: 1, type: "mobility",
    muscles: [], program: "Starter",
    exercises: [
      { name: "Cat-cow", detail: "1 min" },
      { name: "World's greatest stretch", detail: "1 min each side" },
      { name: "Pigeon pose", detail: "1 min each side" },
      { name: "Hamstring stretch", detail: "1 min each side" },
      { name: "Child's pose", detail: "2 min" },
    ],
  },
  {
    id: "yoga-30", name: "Gentle Yoga Flow", minutes: 30, intensity: 1, type: "mobility",
    muscles: ["core"], program: "Starter",
    exercises: [
      { name: "Sun salutations", detail: "5 rounds" },
      { name: "Warrior I / II flow", detail: "5 min" },
      { name: "Hip openers", detail: "8 min" },
      { name: "Savasana", detail: "5 min" },
    ],
  },
];

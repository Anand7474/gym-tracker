export type MuscleKey =
  | "chest" | "delts" | "reardelts" | "triceps" | "biceps" | "forearms" | "abs"
  | "quads" | "hams" | "glutes" | "calves" | "lats" | "traps" | "lowerback";

export type LogKind = "wr" | "r" | "s" | "none";

export interface Meal { time: string; name: string; detail: string; kcal: number; protein: number }

export interface Exercise {
  id: string;
  name: string;
  /** key into library.json (photos + how-to steps) */
  img: string;
  sets?: number;
  reps?: string;
  rest?: number;
  dur?: string;
  cue: string;
  pri: MuscleKey[];
  sec: MuscleKey[];
  log: LogKind;
  /** YouTube search fallback when no specific video is mapped */
  q: string;
}

export interface DayPlan {
  title: string;
  food: "Veg" | "Non-veg";
  focus: string;
  gym: string;
  meals: Meal[];
  ex: Exercise[];
  prep?: string[];
}

const M = (time: string, name: string, detail: string, kcal: number, protein: number): Meal => ({ time, name, detail, kcal, protein });

function E(id: string, name: string, sets: number, reps: string, rest: number, cue: string,
  pri: MuscleKey[], sec: MuscleKey[] = [], log: LogKind = "wr", q?: string, img?: string): Exercise {
  return { id, name, img: img ?? id, sets, reps, rest, cue, pri, sec, log, q: q ?? `${name} proper form` };
}
function C(id: string, name: string, dur: string, cue: string, pri: MuscleKey[], sec: MuscleKey[], img: string, q: string): Exercise {
  return { id, name, img, dur, cue, pri, sec, log: "none", q };
}

const WALK15 = C("walk15", "Incline treadmill walk", "15 min", "Incline 8–10 at 4.5–5 km/h. Don't hold the rails.", [], ["quads", "glutes", "calves"], "walk", "incline treadmill walk for fat loss");
const BIKE10 = C("bike10", "Stationary bike, easy", "10 min", "Easy pace to cool down. Seat at hip height.", [], ["quads", "calves"], "bike", "stationary bike proper setup");

/** Keyed by JS Date.getDay(): 0 = Sunday … 6 = Saturday */
export const PLAN: Record<number, DayPlan> = {
  1: {
    title: "Push day", food: "Veg", focus: "Chest, shoulders, triceps", gym: "Gym 8:00–9:15 pm",
    meals: [
      M("7:45 am", "Besan-soya chilla + 150 g curd", "60 g besan + 30 g soya granules, onion, tomato, 1 tsp oil", 465, 34),
      M("1:00 pm", "3 roti + soya chunk curry + salad", "40 g dry soya, 1 tsp oil", 515, 30),
      M("4:30 pm", "Roasted chana + fruit", "30 g chana, 1 apple or guava", 175, 7),
      M("7:30 pm", "Banana + black coffee", "Pre-workout", 105, 1),
      M("9:20 pm", "Whey in 300 ml milk", "1 Amul sachet", 300, 35),
      M("9:45 pm", "2 roti + dal + paneer bhurji + curd", "50 g paneer, 1 tsp oil, 200 g curd", 620, 29),
    ],
    ex: [
      E("bench", "Barbell bench press", 4, "6–8", 150, "Shoulder blades squeezed back, feet planted, bar touches your lower chest.", ["chest"], ["delts", "triceps"]),
      E("incdb", "Incline dumbbell press", 3, "8–12", 90, "Bench at 30°. Elbows about 45° from your body.", ["chest", "delts"], ["triceps"]),
      E("dbsp", "Seated dumbbell shoulder press", 3, "8–12", 90, "Back flat on the pad. Press up without slamming the elbows locked.", ["delts"], ["triceps"]),
      E("pecdeck", "Pec deck / cable fly", 3, "12–15", 60, "Soft bend in the elbows. Squeeze for 1 s in the middle.", ["chest"], ["delts"], "wr", "pec deck machine fly proper form"),
      E("latraise", "Dumbbell lateral raise", 3, "12–15", 60, "Lead with the elbows, stop at shoulder height, no swinging.", ["delts"], ["traps"]),
      E("pushdown", "Triceps rope pushdown", 3, "10–15", 60, "Elbows pinned to your sides. Spread the rope at the bottom.", ["triceps"]),
      E("ohext", "Overhead cable triceps extension", 2, "12–15", 60, "Elbows point forward. Get a full stretch behind your head.", ["triceps"]),
      WALK15,
    ],
  },
  2: {
    title: "Pull day", food: "Veg", focus: "Back, biceps, rear shoulders", gym: "Gym 8:00–9:15 pm",
    meals: [
      M("7:45 am", "Soya poha + 200 g curd", "50 g poha, 30 g soaked soya chunks, 10 g peanuts, 1 tsp oil", 505, 29),
      M("1:00 pm", "3 roti + chole + raita + salad", "40 g dry chole, 1 tsp oil, 150 g raita", 600, 22),
      M("4:30 pm", "Roasted chana + fruit", "40 g chana", 215, 9),
      M("7:30 pm", "Banana + black coffee", "Pre-workout", 105, 1),
      M("9:20 pm", "Whey in 300 ml milk", "1 Amul sachet", 300, 35),
      M("9:45 pm", "2 roti + soya curry + moong dal + salad", "40 g dry soya, 1 tsp oil", 520, 34),
    ],
    ex: [
      E("pulldown", "Lat pulldown, wide grip", 4, "8–12", 120, "Chest up. Pull the bar to your upper chest, elbows down and back.", ["lats"], ["biceps", "reardelts"], "wr", "lat pulldown proper form"),
      E("cablerow", "Seated cable row", 3, "8–12", 90, "Sit tall, pull to your belly button, squeeze the shoulder blades. No rocking.", ["lats", "traps"], ["biceps", "reardelts"]),
      E("dbrow", "One-arm dumbbell row", 3, "10–12 each", 90, "Flat back. Pull the dumbbell toward your hip, not your chest.", ["lats"], ["biceps", "reardelts"]),
      E("facepull", "Face pull", 3, "12–15", 60, "Rope at face height. Pull to your forehead, thumbs end pointing back.", ["reardelts", "traps"], [], "wr", "cable face pull proper form"),
      E("curl", "EZ-bar or dumbbell curl", 3, "10–12", 60, "Elbows still, no swinging. Lower slowly for 2–3 s.", ["biceps"], ["forearms"], "wr", "ez bar curl proper form"),
      E("hammer", "Hammer curl", 2, "10–12", 60, "Thumbs up. Control the way down.", ["biceps", "forearms"], [], "wr", "dumbbell hammer curl proper form"),
      E("backext", "Back extension", 2, "12–15", 60, "Hinge at the hips. Stop when your body is straight, don't over-arch.", ["lowerback"], ["glutes", "hams"], "wr", "back extension hyperextension proper form"),
      WALK15,
    ],
  },
  3: {
    title: "Leg day", food: "Non-veg", focus: "Quads, hamstrings, calves, core", gym: "Gym 8:00–9:15 pm",
    meals: [
      M("7:45 am", "Egg bhurji + 2 roti", "3 whole eggs + 2 whites, 1 tsp oil", 490, 31),
      M("1:00 pm", "3 roti + chicken curry + salad + curd", "150 g boneless chicken, 1 tsp oil, 100 g curd", 615, 47),
      M("4:30 pm", "Roasted chana + fruit", "30 g chana", 175, 7),
      M("7:30 pm", "Banana + black coffee", "Pre-workout", 105, 1),
      M("9:20 pm", "Whey in 300 ml milk", "1 Amul sachet", 300, 35),
      M("9:45 pm", "2 roti + dal + sabzi + 2 boiled eggs", "1 tsp oil", 540, 27),
    ],
    ex: [
      E("squat", "Barbell back squat", 4, "6–10", 150, "Feet shoulder-width, knees track over toes, hips to at least parallel, chest up. Smith machine is fine at first.", ["quads", "glutes"], ["lowerback", "abs"], "wr", "barbell back squat proper form beginner"),
      E("legpress", "Leg press", 3, "10–12", 120, "Lower back stays on the pad. Never lock the knees at the top.", ["quads", "glutes"]),
      E("lunge", "Dumbbell walking lunge", 2, "10 each leg", 90, "Long step, back knee almost touches the floor, torso upright.", ["quads", "glutes"], ["hams"]),
      E("legext", "Leg extension", 3, "12–15", 60, "Pause for 1 s at the top, lower slowly.", ["quads"], [], "wr", "leg extension machine proper form"),
      E("lyingcurl", "Lying leg curl", 3, "10–12", 60, "Hips stay pressed down. Slow on the way down.", ["hams"], ["calves"]),
      E("standcalf", "Standing calf raise", 3, "12–15", 60, "Full stretch at the bottom, 1 s squeeze at the top.", ["calves"]),
      E("plank", "Plank", 3, "30–45 s", 45, "Squeeze your glutes. Straight line from head to heel.", ["abs"], ["delts"], "s"),
      BIKE10,
    ],
  },
  4: {
    title: "Cardio + core", food: "Non-veg", focus: "Recovery day: cardio, abs, mobility", gym: "Gym 8:00–9:00 pm",
    meals: [
      M("7:45 am", "3 idli + sambar + 2 boiled eggs", "PG breakfast works", 410, 22),
      M("1:00 pm", "3 roti + egg curry + salad + curd", "3 eggs, 1 tsp oil, 100 g curd", 645, 31),
      M("4:30 pm", "Roasted chana + fruit", "30 g chana", 175, 7),
      M("9:05 pm", "Whey in 300 ml milk", "1 Amul sachet", 300, 35),
      M("9:30 pm", "2 roti + chicken curry + dal + sabzi", "150 g boneless chicken, 1 tsp oil", 580, 49),
    ],
    ex: [
      C("walk40", "Incline treadmill walk (or cycle)", "30–40 min", "Incline 8–12 at 4.5–5.5 km/h. You should be able to talk in short sentences.", ["quads", "glutes", "calves"], [], "walk", "incline treadmill walk for fat loss"),
      E("cablecrunch", "Cable crunch", 3, "12–15", 60, "Curl your ribs toward your hips. Don't pull with your arms.", ["abs"], [], "wr", "kneeling cable crunch proper form"),
      E("hkr", "Hanging knee raise", 3, "10–12", 60, "No swinging. Roll your pelvis up at the top.", ["abs"], ["forearms"], "r"),
      E("deadbug", "Dead bug", 3, "10 each side", 45, "Keep your lower back pressed into the floor the whole time.", ["abs"], [], "r", "dead bug exercise proper form"),
      E("sideplank", "Side plank", 2, "30 s each side", 30, "Hips up, body in one straight line.", ["abs"], ["delts"], "s"),
      C("mobility", "Mobility routine", "10 min", "Hip flexor stretch, cat-cow, thoracic rotations, hamstring stretch: 45–60 s each.", [], ["hams", "lowerback", "chest"], "mobility", "10 minute full body mobility routine beginners"),
    ],
  },
  5: {
    title: "Upper body", food: "Non-veg", focus: "Chest, back, shoulders, arms", gym: "Gym 8:00–9:15 pm",
    meals: [
      M("7:45 am", "Oats in milk + 3 boiled eggs", "50 g oats, 250 ml toned milk", 545, 32),
      M("1:00 pm", "3 roti + chicken curry + salad + curd", "150 g boneless chicken, 1 tsp oil, 100 g curd", 615, 47),
      M("4:30 pm", "Roasted chana + fruit", "30 g chana", 175, 7),
      M("7:30 pm", "Banana + black coffee", "Pre-workout", 105, 1),
      M("9:20 pm", "Whey in 300 ml milk", "1 Amul sachet", 300, 35),
      M("9:45 pm", "2 roti + 2-egg omelette + dal + sabzi", "1 tsp oil", 540, 27),
    ],
    ex: [
      E("dbbench", "Flat dumbbell bench press", 3, "8–12", 120, "Shoulder blades back. Lower to chest level, press up and slightly in.", ["chest"], ["delts", "triceps"]),
      E("csrow", "Chest-supported row", 3, "8–12", 90, "Chest stays on the pad. Drive your elbows back.", ["lats", "traps"], ["biceps", "reardelts"], "wr", "chest supported row machine proper form"),
      E("assistpull", "Assisted pull-up machine", 3, "8–12", 90, "Full hang at the bottom, chest toward the bar at the top. Log the assist weight.", ["lats"], ["biceps"]),
      E("machinesp", "Machine shoulder press", 3, "10–12", 90, "Back flat on the pad. Controlled on the way down.", ["delts"], ["triceps"]),
      E("cablelat", "Cable lateral raise", 2, "12–15 each", 60, "Cable starts behind your body. Raise to shoulder height.", ["delts"], [], "wr", "single arm cable lateral raise proper form"),
      E("cablecurl", "Cable curl", 3, "10–15", 60, "Elbows fixed at your sides. Squeeze at the top.", ["biceps"], ["forearms"], "wr", "cable bicep curl proper form"),
      E("assistdip", "Assisted dip machine", 3, "8–12", 60, "Slight forward lean. Lower until elbows reach 90°.", ["triceps", "chest"], ["delts"]),
      WALK15,
    ],
  },
  6: {
    title: "Lower body", food: "Veg", focus: "Hamstrings, glutes, quads, calves", gym: "Train morning or evening",
    meals: [
      M("8:30 am", "2 moong dal chillas + 150 g curd", "60 g soaked moong dal, 30 g paneer stuffing, 1 tsp oil", 425, 25),
      M("1:30 pm", "2 roti + rice + dal + paneer bhurji + salad", "1 cup rice, 75 g paneer, 1 tsp oil", 775, 31),
      M("5:00 pm", "Moong sprouts chaat", "40 g dry moong, onion, tomato, lemon", 140, 10),
      M("Before gym", "Banana + black coffee", "30 min before training", 105, 1),
      M("After gym", "Whey in 300 ml milk", "1 Amul sachet", 300, 35),
      M("9:30 pm", "2 roti + soya curry + sabzi + curd", "40 g dry soya, 1 tsp oil, 150 g curd", 525, 34),
    ],
    ex: [
      E("rdl", "Romanian deadlift", 4, "8–10", 150, "Soft knees, push hips back, bar slides down your thighs, back flat.", ["hams", "glutes"], ["lowerback"], "wr", "barbell romanian deadlift proper form"),
      E("hipthrust", "Hip thrust", 3, "8–12", 120, "Chin tucked, ribs down. Squeeze your glutes 1 s at the top.", ["glutes"], ["hams"], "wr", "barbell hip thrust proper form"),
      E("goblet", "Goblet squat (or hack squat)", 3, "10–12", 90, "Chest upright. Sit down between your heels.", ["quads", "glutes"], ["abs"], "wr", "goblet squat proper form"),
      E("bss", "Bulgarian split squat", 2, "8–10 each", 90, "Rear foot on the bench, front knee over the middle of your foot.", ["quads", "glutes"], ["hams"]),
      E("seatedcurl", "Seated leg curl", 3, "10–12", 60, "Lower slowly for 2–3 s.", ["hams"]),
      E("seatedcalf", "Seated calf raise", 3, "15", 60, "Full stretch at the bottom, pause at the top.", ["calves"]),
      E("pallof", "Pallof press", 2, "10 each side", 45, "Resist the cable's pull. Don't let your torso rotate.", ["abs"]),
      BIKE10,
    ],
  },
  0: {
    title: "Rest + meal prep", food: "Non-veg", focus: "No gym today. Walk 8,000+ steps", gym: "Rest day",
    meals: [
      M("9:00 am", "3-egg omelette + 2 brown bread + fruit", "1 tsp oil", 460, 25),
      M("1:30 pm", "Fish curry + rice + roti + dal + salad", "150 g rohu or basa. Or your weekly flex meal: 1 plate, no extras", 620, 39),
      M("5:00 pm", "Whey in 300 ml milk + roasted chana", "1 Amul sachet, 30 g chana", 410, 41),
      M("9:00 pm", "2 roti + chicken curry + sabzi + curd", "150 g boneless chicken, 1 tsp oil, 150 g curd", 565, 47),
    ],
    ex: [
      C("walk60", "Outdoor walk", "40–60 min", "Easy pace, 8,000+ steps. Good time for a call or a podcast.", ["quads", "calves"], ["glutes"], "walk", "walking for fat loss tips"),
      C("stretch", "Full-body stretch", "10 min", "Hips, hamstrings, chest and upper back.", [], ["hams", "chest", "lats"], "stretch", "10 minute full body stretch routine"),
    ],
    prep: [
      "Measure your waist at the belly button",
      "Boil 8 eggs for Wednesday and Thursday",
      "Set 1 L of curd from toned milk",
      "Portion soya chunks for Monday and Tuesday",
      "Buy chicken for Wednesday and Friday, and marinate it",
      "Restock atta, dal, roasted chana, bananas, salad veg",
      "Check your log: which lifts go up a weight next week?",
    ],
  },
};

export const ALL_EXERCISES: Record<string, Exercise> = {};
Object.values(PLAN).forEach((p) => p.ex.forEach((e) => { ALL_EXERCISES[e.id] = e; }));

export const START_DATE = "2026-11-05";
export const START_WEIGHT = 103;
export const GOAL_WEIGHT = 85;
export const KEY_LIFTS = ["bench", "squat", "rdl", "pulldown", "dbsp", "hipthrust", "legpress", "cablerow"];

const SCOREBOARD_KEY = window.CARLO_INFINITE_PLAY_CONFIG?.scoreboardKey ??
  "carlo-infinite-play-scoreboard-v1";
const MAX_ENTRIES = 10;

function normalizeEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => ({
      name: String(entry?.name ?? "").trim().slice(0, 12) || "PLAYER",
      distance: Math.max(0, Math.floor(Number(entry?.distance) || 0)),
    }))
    .filter((entry) => entry.distance > 0)
    .sort((a, b) => b.distance - a.distance)
    .slice(0, MAX_ENTRIES);
}

export function getScoreboard() {
  try {
    return normalizeEntries(JSON.parse(localStorage.getItem(SCOREBOARD_KEY) ?? "[]"));
  } catch (error) {
    return [];
  }
}

export function qualifiesForScoreboard(distance) {
  const score = Math.max(0, Math.floor(Number(distance) || 0));
  const entries = getScoreboard();
  return score > 0 && (entries.length < MAX_ENTRIES || score > entries[entries.length - 1].distance);
}

export function saveScoreboardEntry(name, distance) {
  const cleanName = String(name ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .trim()
    .slice(0, 12) || "PLAYER";
  const entries = normalizeEntries([
    ...getScoreboard(),
    { name: cleanName, distance },
  ]);

  localStorage.setItem(SCOREBOARD_KEY, JSON.stringify(entries));
  return entries;
}

export function clearScoreboard() {
  localStorage.removeItem(SCOREBOARD_KEY);
}

export function getRecordThresholds() {
  return getScoreboard()
    .map((entry, index) => ({
      distance: entry.distance,
      isTopRecord: index === 0,
    }))
    .filter((entry) => entry.distance > 0);
}

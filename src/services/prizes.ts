import type { Prize, DrawResult, BotParticipant } from "../types";

const PRIZES_KEY      = "vatech_prizes";
const DRAW_RESULTS_KEY = "vatech_draw_results";

// ── Prizes ────────────────────────────────────────────────────────────────────

export function getPrizes(): Prize[] {
  try { return JSON.parse(localStorage.getItem(PRIZES_KEY) || "[]"); }
  catch { return []; }
}

export function addPrize(name: string): Prize {
  const prizes = getPrizes();
  const prize: Prize = { id: Date.now(), name, addedAt: new Date().toISOString() };
  localStorage.setItem(PRIZES_KEY, JSON.stringify([...prizes, prize]));
  return prize;
}

export function deletePrize(id: number): void {
  localStorage.setItem(PRIZES_KEY, JSON.stringify(getPrizes().filter(p => p.id !== id)));
}

// ── Draw results ──────────────────────────────────────────────────────────────

export function getDrawResults(): DrawResult[] {
  try { return JSON.parse(localStorage.getItem(DRAW_RESULTS_KEY) || "[]"); }
  catch { return []; }
}

export function saveDrawResult(result: DrawResult): void {
  localStorage.setItem(DRAW_RESULTS_KEY, JSON.stringify([result, ...getDrawResults()]));
}

// ── Bot API ───────────────────────────────────────────────────────────────────

export async function fetchBotParticipants(botUrl: string): Promise<BotParticipant[]> {
  const base = botUrl || `${window.location.protocol}//${window.location.hostname}:18824`;
  const res = await fetch(`${base.replace(/\/$/, "")}/participants`);
  if (!res.ok) throw new Error(`Bot returned ${res.status}`);
  const json = await res.json();
  return json.participants as BotParticipant[];
}

export async function notifyWinner(
  botUrl: string,
  chat_id: number,
  winner_name: string,
  prize_name: string,
): Promise<boolean> {
  const base = botUrl || `${window.location.protocol}//${window.location.hostname}:18824`;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id, winner_name, prize_name }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

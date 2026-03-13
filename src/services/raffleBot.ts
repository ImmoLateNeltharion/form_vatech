import type { RaffleFormData } from "../types";

/**
 * Send raffle registration to the bot as a pending entry.
 * Returns the deep-link token, or null on failure.
 * If botUrl is not configured, falls back to same host on port 18824.
 */
export async function sendRaffleToBot(
  botUrl: string,
  data: RaffleFormData
): Promise<string | null> {
  const url = botUrl || `${window.location.protocol}//${window.location.hostname}:18824`;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/pending`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: data.firstName,
        phone: data.phone,
        clinic: data.clinic,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.token ?? null;
  } catch {
    return null;
  }
}

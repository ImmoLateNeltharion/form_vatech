import type { RaffleFormData } from "../types";

/**
 * Send raffle registration to the bot as a pending entry.
 * Returns the deep-link token, or null on failure.
 */
export async function sendRaffleToBot(
  botUrl: string,
  data: RaffleFormData
): Promise<string | null> {
  if (!botUrl) return null;
  try {
    const res = await fetch(`${botUrl.replace(/\/$/, "")}/pending`, {
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

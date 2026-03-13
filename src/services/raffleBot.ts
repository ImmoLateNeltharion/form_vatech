import type { RaffleFormData } from "../types";

/**
 * Send raffle registration to the Telegram bot's HTTP API.
 * Called alongside Bitrix/Yandex on raffle form submit.
 */
export async function sendRaffleToBot(
  botUrl: string,
  data: RaffleFormData
): Promise<boolean> {
  if (!botUrl) return false;
  try {
    const res = await fetch(`${botUrl.replace(/\/$/, "")}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: data.firstName,
        phone: data.phone,
        clinic: data.clinic,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

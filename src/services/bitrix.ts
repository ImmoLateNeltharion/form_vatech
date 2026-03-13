import type { LeadFormData, RaffleFormData } from "../types";

async function postBitrix(webhookUrl: string, params: Record<string, string>): Promise<boolean> {
  try {
    const base = webhookUrl.replace(/\/$/, "");
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${base}/crm.lead.add.json?${qs}`, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendLeadToBitrix(webhookUrl: string, data: LeadFormData): Promise<boolean> {
  if (!webhookUrl) return false;
  return postBitrix(webhookUrl, {
    TITLE: `Лид (выставка): ${data.firstName} — ${data.clinic}`,
    NAME: data.firstName,
    PHONE: JSON.stringify([{ VALUE: data.phone, VALUE_TYPE: "WORK" }]),
    EMAIL: JSON.stringify([{ VALUE: data.email, VALUE_TYPE: "WORK" }]),
    COMMENTS: [
      `Клиника: ${data.clinic}`,
      `Город: ${data.city}`,
      `Специализация: ${data.specialization}`,
      `Продукты: ${data.products.join(", ")}`,
      data.cooperation ? `Сотрудничество: ${data.cooperation}` : "",
    ].filter(Boolean).join("\n"),
    SOURCE_ID: "EXHIBITION",
    SOURCE_DESCRIPTION: "Анкета лида — выставка Vatech",
  });
}

export async function sendRaffleToBitrix(webhookUrl: string, data: RaffleFormData): Promise<boolean> {
  if (!webhookUrl) return false;
  return postBitrix(webhookUrl, {
    TITLE: `Розыгрыш: ${data.firstName} — ${data.phone}`,
    NAME: data.firstName,
    PHONE: JSON.stringify([{ VALUE: data.phone, VALUE_TYPE: "WORK" }]),
    COMMENTS: [
      data.clinic ? `Клиника: ${data.clinic}` : "",
    ].filter(Boolean).join("\n"),
    SOURCE_ID: "EXHIBITION",
    SOURCE_DESCRIPTION: "Розыгрыш билетов — выставка Vatech",
  });
}

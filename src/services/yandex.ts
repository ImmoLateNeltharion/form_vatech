import type { LeadFormData, RaffleFormData } from "../types";

/* ---------------------------------------------------------------
   Yandex Sheets API — append a row
--------------------------------------------------------------- */
async function appendRow(documentId: string, token: string, row: (string | undefined)[]): Promise<boolean> {
  try {
    const res = await fetch(
      `https://sheets.yandex.net/api/v1/spreadsheets/${documentId}/values/A1:append`,
      {
        method: "POST",
        headers: { Authorization: `OAuth ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [row], valueInputOption: "USER_ENTERED" }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendToYandexSheet(
  documentId: string,
  token: string,
  data: LeadFormData
): Promise<boolean> {
  if (!documentId || !token) return false;
  const now = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
  return appendRow(documentId, token, [
    now, data.firstName, data.clinic, data.phone,
    data.email, data.city, data.specialization,
    data.products.join("; "), data.cooperation,
  ]);
}

export async function sendRaffleToYandexSheet(
  documentId: string,
  token: string,
  data: RaffleFormData
): Promise<boolean> {
  if (!documentId || !token) return false;
  const now = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
  return appendRow(documentId, token, [now, data.firstName, data.phone, data.clinic]);
}

/* ---------------------------------------------------------------
   Yandex Forms — hidden POST (no-cors)
--------------------------------------------------------------- */
export async function sendToYandexForm(formUrl: string, data: LeadFormData): Promise<boolean> {
  if (!formUrl) return false;
  try {
    const body = new FormData();
    body.append("answer_short_text_1", data.firstName);
    body.append("answer_short_text_2", data.clinic);
    body.append("answer_short_text_3", data.phone);
    body.append("answer_short_text_4", data.email ?? "");
    body.append("answer_short_text_5", data.city);
    body.append("answer_short_text_6", data.specialization);
    body.append("answer_choices_7", data.products.join(", "));
    body.append("answer_long_text_8", data.cooperation ?? "");
    const res = await fetch(formUrl, { method: "POST", body, mode: "no-cors" });
    return res.type === "opaque" || res.ok;
  } catch {
    return false;
  }
}

export async function sendRaffleToYandexForm(formUrl: string, data: RaffleFormData): Promise<boolean> {
  if (!formUrl) return false;
  try {
    const body = new FormData();
    body.append("answer_short_text_1", data.firstName);
    body.append("answer_short_text_2", data.phone);
    body.append("answer_short_text_3", data.clinic ?? "");
    // field 4 removed (city was removed from raffle form)
    const res = await fetch(formUrl, { method: "POST", body, mode: "no-cors" });
    return res.type === "opaque" || res.ok;
  } catch {
    return false;
  }
}

import type { Submission, LeadFormData, RaffleFormData, FormType } from "../types";

const KEY = "vatech_submissions";

export function getSubmissions(): Submission[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function addLeadSubmission(
  data: LeadFormData,
  bitrixSent: boolean,
  yandexSent: boolean
): Submission {
  const all = getSubmissions();
  const entry: Submission = {
    id: Date.now(),
    formType: "lead",
    firstName: data.firstName,
    clinic: data.clinic,
    phone: data.phone,
    email: data.email,
    city: data.city,
    specialization: data.specialization,
    products: data.products,
    cooperation: data.cooperation,
    createdAt: new Date().toISOString(),
    bitrixSent,
    yandexSent,
  };
  localStorage.setItem(KEY, JSON.stringify([entry, ...all]));
  return entry;
}

export function addRaffleSubmission(
  data: RaffleFormData,
  bitrixSent: boolean,
  yandexSent: boolean
): Submission {
  const all = getSubmissions();
  const entry: Submission = {
    id: Date.now(),
    formType: "raffle",
    firstName: data.firstName,
    phone: data.phone,
    clinic: data.clinic,
    city: data.city,
    createdAt: new Date().toISOString(),
    bitrixSent,
    yandexSent,
  };
  localStorage.setItem(KEY, JSON.stringify([entry, ...all]));
  return entry;
}

export function clearSubmissions(type?: FormType): void {
  if (!type) {
    localStorage.removeItem(KEY);
    return;
  }
  const filtered = getSubmissions().filter((s) => s.formType !== type);
  localStorage.setItem(KEY, JSON.stringify(filtered));
}

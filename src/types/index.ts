// ─── Form 1: Lead generation ─────────────────────────────────────────────────
export interface LeadFormData {
  firstName: string;
  clinic: string;
  phone: string;
  email: string;
  city: string;
  specialization: string;
  products: string[];
  cooperation: string;
  consent: boolean;
}

// ─── Form 2: Raffle ───────────────────────────────────────────────────────────
export interface RaffleFormData {
  firstName: string;
  phone: string;
  clinic: string;
  consent: boolean;
}

// ─── Admin / storage ─────────────────────────────────────────────────────────
export type FormType = "lead" | "raffle";

export interface Submission {
  id: number;
  formType: FormType;
  firstName: string;
  clinic?: string;
  phone: string;
  email?: string;
  city?: string;
  specialization?: string;
  products?: string[];
  cooperation?: string;
  createdAt: string;
  bitrixSent: boolean;
  yandexSent: boolean;
}

// ─── Prizes & draw ────────────────────────────────────────────────────────────
export interface Prize {
  id: number;
  name: string;
  addedAt: string;
}

export interface BotParticipant {
  id: number;
  name: string;
  phone: string;
  clinic: string;
  chat_id: number | null;
  registered_at: string;
}

export interface DrawResult {
  id: number;
  prizeName: string;
  winnerId: number;
  winnerName: string;
  winnerPhone: string;
  winnerClinic: string;
  notified: boolean;
  drawnAt: string;
}

export interface AdminConfig {
  bitrixWebhookUrl: string;
  yandexSheetId: string;
  yandexToken: string;
  yandexFormUrl: string;
  // per-city yandex form URLs
  yandexFormUrlKrasnodar: string;
  yandexFormUrlMoscow: string;
  // raffle-specific
  yandexRaffleSheetId: string;
  yandexRaffleFormUrl: string;
  // feedback-specific
  yandexFeedbackSheetId: string;
  // raffle bot
  raffleBotUrl: string;
  raffleBotUsername: string;
  raffleBotToken: string;
  raffleBotAdminIds: string;
  // social links (shown on success screen)
  telegramUrl: string;
  instagramUrl: string;
}

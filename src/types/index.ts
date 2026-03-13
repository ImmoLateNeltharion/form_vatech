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

export interface AdminConfig {
  bitrixWebhookUrl: string;
  yandexSheetId: string;
  yandexToken: string;
  yandexFormUrl: string;
  // raffle-specific
  yandexRaffleSheetId: string;
  yandexRaffleFormUrl: string;
  // feedback-specific
  yandexFeedbackSheetId: string;
  // raffle bot
  raffleBotUrl: string;
  raffleBotUsername: string;
  // social links (shown on success screen)
  telegramUrl: string;
  instagramUrl: string;
}

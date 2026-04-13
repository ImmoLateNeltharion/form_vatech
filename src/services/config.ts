import type { AdminConfig } from "../types";

const CONFIG_KEY = "vatech_admin_config";

export const defaultConfig: AdminConfig = {
  bitrixWebhookUrl: "",
  yandexSheetId: "",
  yandexToken: "",
  yandexFormUrl: "",
  yandexFormUrlKrasnodar: "https://forms.yandex.ru/u/69d909455056902452e783a4",
  yandexFormUrlMoscow:    "https://forms.yandex.ru/u/69d905b190fa7b3121924639",
  yandexRaffleSheetId: "",
  yandexRaffleFormUrl: "",
  yandexFeedbackSheetId: "",
  raffleBotUrl:      import.meta.env.VITE_BOT_URL      || "",
  raffleBotUsername: import.meta.env.VITE_BOT_USERNAME || "",
  raffleBotToken: "",
  raffleBotAdminIds: "",
  telegramUrl: "",
  instagramUrl: "",
};

export function loadConfig(): AdminConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...defaultConfig };
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {
    return { ...defaultConfig };
  }
}

export function saveConfig(config: AdminConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

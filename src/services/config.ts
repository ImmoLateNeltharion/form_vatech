import type { AdminConfig } from "../types";

const CONFIG_KEY = "vatech_admin_config";

export const defaultConfig: AdminConfig = {
  bitrixWebhookUrl: "",
  yandexSheetId: "",
  yandexToken: "",
  yandexFormUrl: "",
  yandexRaffleSheetId: "",
  yandexRaffleFormUrl: "",
  yandexFeedbackSheetId: "",
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

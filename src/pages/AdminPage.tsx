import { useState, useEffect, useRef, useCallback } from "react";
import {
  Settings, Table, Save, Trash2, Download,
  Eye, EyeOff, RefreshCw, ChevronDown, ChevronUp, Gift, Ticket, HelpCircle,
  Trophy, X, Shuffle, CheckCircle, AlertCircle, Loader2, Clock,
} from "lucide-react";
import { VatechLogo } from "../components/VatechLogo";
import { StatusBadge } from "../components/StatusBadge";
import { loadConfig, saveConfig } from "../services/config";
import { getSubmissions, clearSubmissions } from "../services/submissions";
import {
  getDrawResults, saveDrawResult,
  fetchBotParticipants, notifyWinner, resetBotParticipants,
} from "../services/prizes";
import type { AdminConfig, Submission, FormType, DrawResult, BotParticipant } from "../types";

const ADMIN_PASSWORD = "kali kali";
const AUTH_KEY = "vatech_admin_auth";

function LoginScreen({ onAuth }: { onAuth: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "1");
      onAuth();
    } else {
      setError(true);
      setValue("");
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-vatech-gray-light flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-vatech-border shadow-card p-8 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <VatechLogo className="h-10 w-auto" />
        </div>
        <h1 className="text-lg font-bold text-vatech-dark text-center mb-6">Панель администратора</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="vatech-label">Пароль</label>
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              className={`vatech-input ${error ? "border-vatech-red" : ""}`}
              placeholder="Введите пароль"
            />
            {error && <p className="error-text mt-1">Неверный пароль</p>}
          </div>
          <button type="submit" className="vatech-btn-primary">Войти</button>
        </form>
      </div>
    </div>
  );
}

type Tab = "lead" | "raffle" | "settings" | "help";

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === "1");
  const [tab, setTab] = useState<Tab>("lead");
  const [all, setAll] = useState<Submission[]>([]);
  const [config, setConfig] = useState<AdminConfig>(loadConfig);
  const [saved, setSaved] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const reload = () => setAll(getSubmissions());
  useEffect(() => { if (authed) reload(); }, [tab, authed]);

  if (!authed) return <LoginScreen onAuth={() => setAuthed(true)} />;

  const leads = all.filter((s) => s.formType === "lead");
  const raffles = all.filter((s) => s.formType === "raffle");

  const handleSave = () => {
    saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = (type: FormType) => {
    if (window.confirm(`Удалить все записи из «${type === "lead" ? "Анкеты лида" : "Розыгрыша"}»?`)) {
      clearSubmissions(type);
      reload();
    }
  };

  const exportCsv = (type: FormType) => {
    const rows = all.filter((s) => s.formType === type);
    const isLead = type === "lead";
    const header = isLead
      ? ["Дата", "Имя", "Клиника", "Телефон", "Email", "Город", "Специализация", "Продукты", "Сотрудничество", "Bitrix", "Yandex"]
      : ["Дата", "Имя", "Телефон", "Клиника", "Город", "Bitrix"];
    const data = rows.map((s) => {
      const d = new Date(s.createdAt).toLocaleString("ru-RU");
      return isLead
        ? [d, s.firstName, s.clinic, s.phone, s.email, s.city, s.specialization, (s.products ?? []).join("; "), s.cooperation, s.bitrixSent ? "✓" : "✗", s.yandexSent ? "✓" : "✗"]
        : [d, s.firstName, s.phone, s.clinic, s.city, s.bitrixSent ? "✓" : "✗"];
    });
    const csv = [header, ...data]
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vatech_${type}_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-vatech-gray-light flex flex-col">
      <header className="bg-vatech-dark text-white">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <VatechLogo className="h-8 w-auto brightness-0 invert" />
            <span className="text-white/50 text-sm hidden sm:block">/ Панель администратора</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/60">
            <a href="/" className="hover:text-white transition-colors">Форма 1 ↗</a>
            <a href="/raffle" className="hover:text-white transition-colors">Форма 2 ↗</a>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-vatech-border">
        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex gap-0">
            <TabBtn active={tab === "lead"} onClick={() => setTab("lead")}
              icon={<Gift size={15} />} label={`Анкеты лидов (${leads.length})`} />
            <TabBtn active={tab === "raffle"} onClick={() => setTab("raffle")}
              icon={<Ticket size={15} />} label={`Розыгрыш (${raffles.length})`} />
            <TabBtn active={tab === "settings"} onClick={() => setTab("settings")}
              icon={<Settings size={15} />} label="Настройки" />
            <TabBtn active={tab === "help"} onClick={() => setTab("help")}
              icon={<HelpCircle size={15} />} label="Справка" />
          </nav>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {tab === "help" ? <HelpPanel /> : tab === "settings" ? (
          <SettingsPanel config={config} setConfig={setConfig}
            showToken={showToken} setShowToken={setShowToken}
            saved={saved} onSave={handleSave} />
        ) : tab === "raffle" ? (
          <RafflePanel botUrl={config.raffleBotUrl} raffles={raffles} onReload={reload} />
        ) : (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h1 className="text-xl font-bold text-vatech-dark">Анкеты лидов</h1>
              <div className="flex gap-2">
                <button onClick={reload}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-vatech-border text-vatech-gray text-sm font-medium hover:border-vatech-red hover:text-vatech-red transition-colors">
                  <RefreshCw size={14} /> Обновить
                </button>
                <button onClick={() => exportCsv("lead")} disabled={!leads.length}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-vatech-red text-white text-sm font-medium hover:bg-vatech-red-dark transition-colors disabled:opacity-50">
                  <Download size={14} /> CSV
                </button>
                <button onClick={() => handleClear("lead")} disabled={!leads.length}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {leads.length === 0 ? (
              <div className="vatech-card text-center py-16">
                <Table size={48} className="mx-auto text-vatech-border mb-4" />
                <p className="text-vatech-gray-mid font-medium">Записей пока нет</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((s) => (
                  <SubmissionRow key={s.id} s={s}
                    expanded={expanded === s.id}
                    onToggle={() => setExpanded(expanded === s.id ? null : s.id)} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-colors
        ${active ? "border-vatech-red text-vatech-red" : "border-transparent text-vatech-gray-mid hover:text-vatech-dark"}`}>
      {icon}{label}
    </button>
  );
}

function SubmissionRow({ s, expanded, onToggle }: {
  s: Submission; expanded: boolean; onToggle: () => void;
}) {
  const date = new Date(s.createdAt).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  return (
    <div className="vatech-card !p-0 overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex flex-wrap sm:flex-nowrap items-center gap-3 px-5 py-4 text-left hover:bg-vatech-gray-light/50 transition-colors">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-vatech-dark truncate">{s.firstName}</p>
          <p className="text-sm text-vatech-gray-mid truncate">
            {s.phone}{s.clinic ? ` · ${s.clinic}` : ""}{s.city ? ` · ${s.city}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-vatech-gray-mid hidden md:block">{date}</span>
          <StatusBadge sent={s.bitrixSent} label="Bitrix" />
          {s.formType === "lead" && <StatusBadge sent={s.yandexSent} label="Yandex" />}
          {expanded ? <ChevronUp size={16} className="text-vatech-gray-mid" /> : <ChevronDown size={16} className="text-vatech-gray-mid" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-vatech-border px-5 py-5 bg-vatech-gray-light/40">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <Detail label="Дата" value={date} />
            {s.email && <Detail label="Email" value={s.email} />}
            {s.specialization && <Detail label="Специализация" value={s.specialization} />}
            {s.products?.length && (
              <Detail label="Продукты" value={s.products.join(", ")} className="col-span-2 sm:col-span-3" />
            )}
            {s.cooperation && <Detail label="Сотрудничество" value={s.cooperation} className="col-span-2 sm:col-span-3" />}
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  if (!value) return null;
  return (
    <div className={className}>
      <p className="text-vatech-gray-mid text-xs font-semibold uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-vatech-dark font-medium">{value}</p>
    </div>
  );
}

function SettingsPanel({ config, setConfig, showToken, setShowToken, saved, onSave }: {
  config: AdminConfig;
  setConfig: (c: AdminConfig) => void;
  showToken: boolean;
  setShowToken: (v: boolean) => void;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-xl font-bold text-vatech-dark">Настройки интеграций</h1>

      {/* Bitrix */}
      <div className="vatech-card">
        <SectionHead color="bg-vatech-red" title="Bitrix24" desc={`Webhook-URL вида: https://xxx.bitrix24.ru/rest/1/ключ/`} />
        <label className="vatech-label mt-3">Webhook URL (общий для обеих форм)</label>
        <input value={config.bitrixWebhookUrl}
          onChange={(e) => setConfig({ ...config, bitrixWebhookUrl: e.target.value })}
          placeholder="https://xxx.bitrix24.ru/rest/1/xxxxxxxx/"
          className="vatech-input" />
      </div>

      {/* Yandex - Lead */}
      <div className="vatech-card">
        <SectionHead color="bg-red-400" title="Яндекс — Анкета лида" desc="Таблица «Vatech_лиды_выставка» или URL формы" />
        <div className="space-y-3 mt-3">
          <div>
            <label className="vatech-label">ID Яндекс-таблицы (лиды)</label>
            <input value={config.yandexSheetId}
              onChange={(e) => setConfig({ ...config, yandexSheetId: e.target.value })}
              placeholder="ID из URL: /d/{ID}/edit"
              className="vatech-input" />
          </div>
          <div>
            <label className="vatech-label">OAuth-токен Яндекс</label>
            <div className="relative">
              <input type={showToken ? "text" : "password"} value={config.yandexToken}
                onChange={(e) => setConfig({ ...config, yandexToken: e.target.value })}
                placeholder="OAuth-токен" className="vatech-input pr-10" />
              <button type="button" onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-vatech-gray-mid hover:text-vatech-red">
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <Divider />
          <div>
            <label className="vatech-label">URL Яндекс.Формы — Краснодар</label>
            <input value={config.yandexFormUrlKrasnodar ?? ""}
              onChange={(e) => setConfig({ ...config, yandexFormUrlKrasnodar: e.target.value })}
              placeholder="https://forms.yandex.ru/u/..."
              className="vatech-input" />
          </div>
          <div>
            <label className="vatech-label">URL Яндекс.Формы — Москва</label>
            <input value={config.yandexFormUrlMoscow ?? ""}
              onChange={(e) => setConfig({ ...config, yandexFormUrlMoscow: e.target.value })}
              placeholder="https://forms.yandex.ru/u/..."
              className="vatech-input" />
          </div>
          <div>
            <label className="vatech-label">URL Яндекс.Формы (общий / резерв)</label>
            <input value={config.yandexFormUrl}
              onChange={(e) => setConfig({ ...config, yandexFormUrl: e.target.value })}
              placeholder="https://forms.yandex.ru/surveys/XXXXX/answer/"
              className="vatech-input" />
          </div>
        </div>
      </div>

      {/* Yandex - Raffle */}
      <div className="vatech-card">
        <SectionHead color="bg-gray-400" title="Яндекс — Розыгрыш" desc="Таблица «Vatech_розыгрыш_выставка» или URL формы" />
        <div className="space-y-3 mt-3">
          <div>
            <label className="vatech-label">ID Яндекс-таблицы (розыгрыш)</label>
            <input value={config.yandexRaffleSheetId}
              onChange={(e) => setConfig({ ...config, yandexRaffleSheetId: e.target.value })}
              placeholder="ID из URL: /d/{ID}/edit"
              className="vatech-input" />
          </div>
          <Divider />
          <div>
            <label className="vatech-label">URL Яндекс.Формы (розыгрыш)</label>
            <input value={config.yandexRaffleFormUrl}
              onChange={(e) => setConfig({ ...config, yandexRaffleFormUrl: e.target.value })}
              placeholder="https://forms.yandex.ru/surveys/XXXXX/answer/"
              className="vatech-input" />
          </div>
        </div>
      </div>

      {/* Yandex - Feedback */}
      <div className="vatech-card">
        <SectionHead color="bg-blue-400" title="Яндекс — Обратная связь" desc="Таблица для формы /feedback (Vatech_обратная_связь)" />
        <div className="mt-3">
          <label className="vatech-label">ID Яндекс-таблицы (обратная связь)</label>
          <input value={config.yandexFeedbackSheetId}
            onChange={(e) => setConfig({ ...config, yandexFeedbackSheetId: e.target.value })}
            placeholder="ID из URL: /d/{ID}/edit"
            className="vatech-input" />
        </div>
      </div>

      {/* Social links */}
      <div className="vatech-card">
        <SectionHead color="bg-sky-400" title="Соцсети" desc="Ссылки на Telegram и Instagram — показываются на экране благодарности анкеты лида" />
        <div className="space-y-3 mt-3">
          <div>
            <label className="vatech-label">Telegram (канал / группа)</label>
            <input value={config.telegramUrl}
              onChange={(e) => setConfig({ ...config, telegramUrl: e.target.value })}
              placeholder="https://t.me/vatechrussia"
              className="vatech-input" />
          </div>
          <div>
            <label className="vatech-label">Instagram</label>
            <input value={config.instagramUrl}
              onChange={(e) => setConfig({ ...config, instagramUrl: e.target.value })}
              placeholder="https://instagram.com/vatechrussia"
              className="vatech-input" />
          </div>
        </div>
      </div>

      {/* Raffle Bot */}
      <div className="vatech-card">
        <SectionHead color="bg-green-500" title="Telegram-бот розыгрыша" desc="После заполнения формы участник получит ссылку в бота для получения номера." />
        <div className="space-y-3 mt-3">
          <div>
            <label className="vatech-label">URL API бота</label>
            <input value={config.raffleBotUrl}
              onChange={(e) => setConfig({ ...config, raffleBotUrl: e.target.value })}
              placeholder="http://103.113.71.160:18824"
              className="vatech-input" />
          </div>
          <div>
            <label className="vatech-label">Username бота (без @)</label>
            <input value={config.raffleBotUsername}
              onChange={(e) => setConfig({ ...config, raffleBotUsername: e.target.value })}
              placeholder="vsuet_ctf_bot"
              className="vatech-input" />
          </div>
          <div>
            <label className="vatech-label">Токен бота (BOT_TOKEN)</label>
            <input value={config.raffleBotToken}
              onChange={(e) => setConfig({ ...config, raffleBotToken: e.target.value })}
              placeholder="123456789:AAF..."
              className="vatech-input font-mono text-xs"
              type="password" />
          </div>
          <div>
            <label className="vatech-label">ID администраторов (через запятую)</label>
            <input value={config.raffleBotAdminIds}
              onChange={(e) => setConfig({ ...config, raffleBotAdminIds: e.target.value })}
              placeholder="123456789, 987654321"
              className="vatech-input" />
          </div>
        </div>
      </div>

      {/* Bot schedule */}
      <BotScheduleCard botUrl={config.raffleBotUrl} />

      <button onClick={onSave} className="vatech-btn-primary flex items-center justify-center gap-2">
        <Save size={16} />{saved ? "Сохранено ✓" : "Сохранить настройки"}
      </button>
    </div>
  );
}

// Converts "2025-05-27T10:00" (local datetime-input value) → UTC ISO string
function localToIso(local: string): string {
  if (!local) return "";
  return new Date(local).toISOString();
}
// Converts UTC ISO → "YYYY-MM-DDTHH:mm" for datetime-local input (local time)
function isoToLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function BotScheduleCard({ botUrl }: { botUrl: string }) {
  const [openFrom,  setOpenFrom]  = useState("");
  const [openUntil, setOpenUntil] = useState("");
  const [status, setStatus] = useState<"idle"|"loading"|"saved"|"error">("idle");
  const [botOpen, setBotOpen] = useState<boolean | null>(null);
  const [loadErr, setLoadErr] = useState(false);

  const load = useCallback(async () => {
    if (!botUrl) return;
    try {
      const r = await fetch(`${botUrl}/schedule`);
      const d = await r.json();
      setOpenFrom(isoToLocal(d.open_from || ""));
      setOpenUntil(isoToLocal(d.open_until || ""));
      setLoadErr(false);
    } catch { setLoadErr(true); }
  }, [botUrl]);

  const checkOpen = useCallback(async () => {
    if (!botUrl) return;
    try {
      const r = await fetch(`${botUrl}/health`);
      const d = await r.json();
      setBotOpen(d.bot_open ?? null);
    } catch { setBotOpen(null); }
  }, [botUrl]);

  useEffect(() => { load(); checkOpen(); }, [load, checkOpen]);

  const handleSave = async () => {
    if (!botUrl) return;
    setStatus("loading");
    try {
      const r = await fetch(`${botUrl}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          open_from:  localToIso(openFrom),
          open_until: localToIso(openUntil),
        }),
      });
      const d = await r.json();
      if (d.ok) { setBotOpen(d.bot_open); setStatus("saved"); setTimeout(() => setStatus("idle"), 2500); }
      else { setStatus("error"); }
    } catch { setStatus("error"); }
  };

  const handleClear = async () => {
    setOpenFrom(""); setOpenUntil("");
    if (!botUrl) return;
    setStatus("loading");
    try {
      await fetch(`${botUrl}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ open_from: "", open_until: "" }),
      });
      setBotOpen(true);
      setStatus("saved"); setTimeout(() => setStatus("idle"), 2500);
    } catch { setStatus("error"); }
  };

  const isBusy = status === "loading";

  return (
    <div className="vatech-card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="w-2 h-6 bg-orange-400 rounded-full flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-vatech-dark flex items-center gap-2">
              Расписание бота
              {botOpen === true && <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">🟢 открыт</span>}
              {botOpen === false && <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">🔴 закрыт</span>}
              {botOpen === null && !loadErr && <span className="text-xs text-vatech-gray-mid">…</span>}
              {loadErr && <span className="text-xs text-amber-600">⚠ бот недоступен</span>}
            </p>
            <p className="text-xs text-vatech-gray-mid mt-0.5">
              Вне указанного окна бот отклоняет новые регистрации. Если поля пусты — принимает всегда.
            </p>
          </div>
        </div>
        <button onClick={() => { load(); checkOpen(); }} disabled={isBusy}
          className="text-vatech-gray-mid hover:text-vatech-red transition-colors flex-shrink-0">
          <RefreshCw size={14} className={isBusy ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="vatech-label flex items-center gap-1.5"><Clock size={12} /> Открыть с</label>
          <input type="datetime-local" value={openFrom}
            onChange={e => setOpenFrom(e.target.value)}
            className="vatech-input text-sm" />
        </div>
        <div>
          <label className="vatech-label flex items-center gap-1.5"><Clock size={12} /> Закрыть до</label>
          <input type="datetime-local" value={openUntil}
            onChange={e => setOpenUntil(e.target.value)}
            className="vatech-input text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={handleSave} disabled={isBusy}
          className="vatech-btn-primary flex items-center gap-2 py-2 text-sm disabled:opacity-50">
          {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {status === "saved" ? "Сохранено ✓" : "Применить расписание"}
        </button>
        <button onClick={handleClear} disabled={isBusy}
          className="px-3 py-2 rounded-lg border border-vatech-border text-vatech-gray text-sm hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-50">
          Сбросить
        </button>
        {status === "error" && <span className="text-xs text-red-500">Ошибка — проверьте URL бота</span>}
      </div>
    </div>
  );
}

function SectionHead({ color, title, desc }: { color: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`w-2 h-6 ${color} rounded-full flex-shrink-0 mt-0.5`} />
      <div>
        <p className="font-bold text-vatech-dark">{title}</p>
        <p className="text-xs text-vatech-gray-mid mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-vatech-border" />
      <span className="text-xs text-vatech-gray-mid font-medium">ИЛИ</span>
      <div className="flex-1 h-px bg-vatech-border" />
    </div>
  );
}

// ── Raffle Panel ──────────────────────────────────────────────────────────────

function RafflePanel({ botUrl, raffles, onReload }: {
  botUrl: string;
  raffles: Submission[];
  onReload: () => void;
}) {
  const [results, setResults]       = useState<DrawResult[]>(getDrawResults);
  const [prizeName, setPrizeName]   = useState("");
  const [drawState, setDrawState]   = useState<"idle" | "loading" | "done" | "error">("idle");
  const [lastResult, setLastResult] = useState<DrawResult | null>(null);
  const [errMsg, setErrMsg]         = useState("");
  const [resetting, setResetting]   = useState(false);
  const [botParts, setBotParts]     = useState<BotParticipant[]>([]);
  const [botLoading, setBotLoading] = useState(false);
  const [broadcastState, setBroadcastState] = useState<Record<string, "idle" | "loading" | "done" | "error">>({});
  const [broadcastResult, setBroadcastResult] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const norm = (p: string) => p.replace(/\D/g, "");

  const refreshResults = () => setResults(getDrawResults());

  const loadBot = async () => {
    setBotLoading(true);
    try { setBotParts(await fetchBotParticipants(botUrl)); }
    catch { /* bot offline */ }
    finally { setBotLoading(false); }
  };

  useEffect(() => { loadBot(); }, []);

  // Priority pool:
  // 1. Bot-confirmed (chat_id != null), minus previous winners
  // 2. Fallback: all raffle form submissions, minus previous winners
  const buildPool = (currentResults: DrawResult[]) => {
    const wonPhones = new Set(currentResults.map(r => norm(r.winnerPhone)));

    // Confirmed via bot
    const confirmed = botParts.filter(bp => bp.chat_id && !wonPhones.has(norm(bp.phone)));
    if (confirmed.length > 0) {
      return { entries: confirmed.map(bp => ({
        name: bp.name, phone: bp.phone, clinic: bp.clinic, chat_id: bp.chat_id,
      })), source: "bot" as const };
    }

    // Fallback: form submissions, deduplicated by phone
    const seen = new Set<string>();
    const fallback = raffles.filter(s => {
      const p = norm(s.phone);
      if (wonPhones.has(p) || seen.has(p)) return false;
      seen.add(p);
      return true;
    }).map(s => ({ name: s.firstName, phone: s.phone, clinic: s.clinic ?? "", chat_id: null as number | null }));

    return { entries: fallback, source: "forms" as const };
  };

  const { entries: eligiblePool, source: poolSource } = buildPool(results);

  const handleDraw = async () => {
    const name = prizeName.trim() || "Приз";
    setDrawState("loading");
    setErrMsg("");

    // Reload bot participants right before drawing for up-to-date data
    let freshBotParts = botParts;
    try { freshBotParts = await fetchBotParticipants(botUrl); setBotParts(freshBotParts); }
    catch { /* use cached */ }

    const currentResults = getDrawResults();
    const wonPhones = new Set(currentResults.map(r => norm(r.winnerPhone)));

    const confirmed = freshBotParts.filter(bp => bp.chat_id && !wonPhones.has(norm(bp.phone)));
    let pool: Array<{ name: string; phone: string; clinic: string; chat_id: number | null }>;
    let src: "bot" | "forms";

    if (confirmed.length > 0) {
      pool = confirmed.map(bp => ({ name: bp.name, phone: bp.phone, clinic: bp.clinic, chat_id: bp.chat_id }));
      src = "bot";
    } else {
      const seen = new Set<string>();
      pool = raffles.filter(s => {
        const p = norm(s.phone);
        if (wonPhones.has(p) || seen.has(p)) return false;
        seen.add(p);
        return true;
      }).map(s => ({ name: s.firstName, phone: s.phone, clinic: s.clinic ?? "", chat_id: null }));
      src = "forms";
    }

    if (pool.length === 0) {
      setErrMsg("Нет доступных участников (все уже выиграли или список пуст).");
      setDrawState("error");
      return;
    }

    const winner = pool[Math.floor(Math.random() * pool.length)];
    let notified = false;
    if (winner.chat_id) {
      notified = await notifyWinner(botUrl, winner.chat_id, winner.name, name);
    }

    const result: DrawResult = {
      id: Date.now(),
      prizeName: name,
      winnerId: 0,
      winnerName: winner.name,
      winnerPhone: winner.phone,
      winnerClinic: winner.clinic,
      notified,
      drawnAt: new Date().toISOString(),
    };
    saveDrawResult(result);
    setLastResult({ ...result, _source: src } as DrawResult & { _source: string });
    setDrawState("done");
    refreshResults();
  };

  const resetDraw = () => { setDrawState("idle"); setLastResult(null); setErrMsg(""); };

  const handleRefresh = async () => {
    onReload();
    await loadBot();
    resetDraw();
  };

  const handleBroadcast = async (kind: "announce" | "hour" | "launch") => {
    setBroadcastState(s => ({ ...s, [kind]: "loading" }));
    setBroadcastResult(r => ({ ...r, [kind]: "" }));
    try {
      const res = await fetch(`${botUrl}/broadcast/${kind}`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        const warn = data.sent === 0 ? "Нет подтверждённых участников" : `Отправлено: ${data.sent} из ${data.total}`;
        setBroadcastResult(r => ({ ...r, [kind]: warn }));
        setBroadcastState(s => ({ ...s, [kind]: "done" }));
      } else {
        setBroadcastResult(r => ({ ...r, [kind]: data.error ?? "Ошибка" }));
        setBroadcastState(s => ({ ...s, [kind]: "error" }));
      }
    } catch {
      setBroadcastResult(r => ({ ...r, [kind]: "Бот недоступен" }));
      setBroadcastState(s => ({ ...s, [kind]: "error" }));
    }
  };

  const handleBotReset = async () => {
    if (!window.confirm("Удалить всех участников из базы Telegram-бота? Это действие нельзя отменить.")) return;
    setResetting(true);
    try {
      const n = await resetBotParticipants(botUrl);
      setBotParts([]);
      window.alert(`Удалено ${n} участников из базы бота.`);
    } catch {
      window.alert("Не удалось подключиться к боту. Проверьте URL бота в настройках.");
    } finally {
      setResetting(false);
    }
  };

  const isBusy = drawState === "loading";
  const confirmedCount = botParts.filter(bp => bp.chat_id).length;
  const wonPhoneSet = new Set(results.map(r => norm(r.winnerPhone)));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-vatech-red" />
          <h1 className="text-xl font-bold text-vatech-dark">Розыгрыш призов</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-vatech-gray-mid flex-wrap">
          <button onClick={handleRefresh} disabled={isBusy || botLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-vatech-border text-vatech-gray hover:border-vatech-red hover:text-vatech-red transition-colors text-sm disabled:opacity-50">
            <RefreshCw size={13} className={botLoading ? "animate-spin" : ""} /> Обновить
          </button>
          <button onClick={handleBotReset} disabled={isBusy || resetting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-colors text-sm disabled:opacity-50">
            {resetting ? <><Loader2 size={13} className="animate-spin" /> Сброс…</> : <>🗑 Сбросить БД бота</>}
          </button>
          <span>✈️ В боте: <strong className="text-vatech-dark">{confirmedCount}</strong></span>
          <span>·</span>
          <span>📋 Анкет: <strong className="text-vatech-dark">{raffles.length}</strong></span>
          <span>·</span>
          <span>Доступны: <strong className={eligiblePool.length === 0 ? "text-red-500" : "text-green-600"}>{eligiblePool.length}</strong></span>
        </div>
      </div>

      {/* Pool source hint */}
      {eligiblePool.length > 0 && (
        <div className={`text-xs px-4 py-2 rounded-lg font-medium flex items-center gap-2
          ${poolSource === "bot"
            ? "bg-blue-50 border border-blue-100 text-blue-700"
            : "bg-amber-50 border border-amber-100 text-amber-700"}`}>
          {poolSource === "bot"
            ? <>✈️ Розыгрыш среди подтверждённых в Telegram — {eligiblePool.length} чел.</>
            : <>📋 В боте нет подтверждённых — розыгрыш среди всех участников анкеты ({eligiblePool.length} чел.)</>}
        </div>
      )}

      {/* Broadcast buttons */}
      {(() => {
        const BTNS: { kind: "announce" | "hour" | "launch"; label: string; icon: string; desc: string }[] = [
          { kind: "announce", icon: "🌙", label: "Анонс",       desc: "Vatech Night — скоро розыгрыш" },
          { kind: "hour",     icon: "⏰", label: "1 час до",    desc: "Финальное напоминание" },
          { kind: "launch",   icon: "🎉", label: "Запуск",      desc: "Запускаем рандомайзер" },
        ];
        return (
          <div className="vatech-card space-y-3">
            <p className="text-xs font-semibold text-vatech-gray-mid uppercase tracking-wide">Рассылки участникам</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {BTNS.map(({ kind, icon, label, desc }) => {
                const st = broadcastState[kind] ?? "idle";
                const res = broadcastResult[kind];
                return (
                  <div key={kind} className="flex flex-col gap-1">
                    <button
                      onClick={() => handleBroadcast(kind)}
                      disabled={st === "loading" || isBusy}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50
                        ${st === "done"  ? "bg-green-50 border-green-200 text-green-700" :
                          st === "error" ? "bg-red-50 border-red-200 text-red-600" :
                          "bg-vatech-gray-light border-vatech-border text-vatech-dark hover:border-vatech-red hover:text-vatech-red"}`}
                    >
                      {st === "loading"
                        ? <Loader2 size={14} className="animate-spin" />
                        : <span>{icon}</span>}
                      {label}
                    </button>
                    <p className="text-xs text-center text-vatech-gray-mid leading-tight">
                      {res || desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Result banner */}
      {drawState === "done" && lastResult && (
        <div className="vatech-card border-green-200 bg-green-50 relative">
          <button onClick={resetDraw} className="absolute top-3 right-3 text-green-400 hover:text-green-600"><X size={16} /></button>
          <div className="flex items-start gap-3">
            <CheckCircle size={24} className="text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-green-800 text-lg">🎉 Победитель определён!</p>
              <p className="text-green-700 mt-1 font-semibold">{lastResult.winnerName}{lastResult.winnerClinic ? ` · ${lastResult.winnerClinic}` : ""}</p>
              <p className="text-green-600 text-sm">{lastResult.winnerPhone}</p>
              <p className="text-green-600 text-sm mt-1">Приз: <strong>{lastResult.prizeName}</strong></p>
              {lastResult.notified
                ? <p className="text-green-500 text-xs mt-1">✓ Сообщение в Telegram отправлено</p>
                : <p className="text-amber-600 text-xs mt-1">⚠ Telegram-уведомление не отправлено (участник не подтверждён в боте)</p>}
            </div>
          </div>
        </div>
      )}

      {drawState === "error" && (
        <div className="vatech-card border-red-200 bg-red-50 relative">
          <button onClick={resetDraw} className="absolute top-3 right-3 text-red-300 hover:text-red-500"><X size={16} /></button>
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500" />
            <p className="text-red-700 text-sm">{errMsg}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Draw controls */}
        <div className="vatech-card space-y-4">
          <p className="font-semibold text-vatech-dark text-sm">Провести розыгрыш</p>

          <div>
            <label className="vatech-label">Название приза</label>
            <input ref={inputRef} value={prizeName} onChange={e => setPrizeName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !isBusy && eligiblePool.length > 0 && handleDraw()}
              placeholder="Например: Термокружка Vatech"
              className="vatech-input text-sm" />
          </div>

          <button onClick={handleDraw} disabled={isBusy || eligiblePool.length === 0}
            className="vatech-btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
            {isBusy
              ? <><Loader2 size={16} className="animate-spin" /> Розыгрыш…</>
              : <><Shuffle size={16} /> Разыграть среди {eligiblePool.length} участников</>}
          </button>

          {/* Participants list — bot confirmed first, then form-only */}
          <div className="space-y-2">
            {confirmedCount > 0 && (
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1.5">
                  ✈️ Подтверждены в Telegram ({botParts.filter(bp => bp.chat_id && !wonPhoneSet.has(norm(bp.phone))).length})
                </p>
                <ul className="space-y-1">
                  {botParts.filter(bp => bp.chat_id).map(bp => {
                    const won = wonPhoneSet.has(norm(bp.phone));
                    return (
                      <li key={bp.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                        ${won ? "bg-vatech-gray-light opacity-40" : "bg-blue-50 border border-blue-100"}`}>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-vatech-dark truncate block">{bp.name}</span>
                          <span className="text-xs text-vatech-gray-mid">{bp.phone}{bp.clinic ? ` · ${bp.clinic}` : ""}</span>
                        </div>
                        {won
                          ? <span className="text-xs text-amber-500 flex-shrink-0">победитель</span>
                          : <span className="text-xs text-blue-500 flex-shrink-0">✓ TG</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {raffles.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-vatech-gray-mid uppercase tracking-wide mb-1.5">
                  📋 Все анкеты ({raffles.length})
                </p>
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                  {raffles.map(s => {
                    const won = wonPhoneSet.has(norm(s.phone));
                    const inBot = botParts.some(bp => norm(bp.phone) === norm(s.phone) && bp.chat_id);
                    return (
                      <li key={s.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                        ${won ? "opacity-40 bg-vatech-gray-light" : "bg-vatech-gray-light"}`}>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-vatech-dark truncate block">{s.firstName}</span>
                          <span className="text-xs text-vatech-gray-mid">{s.phone}{s.clinic ? ` · ${s.clinic}` : ""}</span>
                        </div>
                        {won
                          ? <span className="text-xs text-amber-500 flex-shrink-0">победитель</span>
                          : inBot
                            ? <span className="text-xs text-blue-400 flex-shrink-0">✓ TG</span>
                            : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {raffles.length === 0 && confirmedCount === 0 && (
              <div className="text-center py-6">
                <Table size={32} className="mx-auto text-vatech-border mb-2" />
                <p className="text-vatech-gray-mid text-sm">Участников пока нет</p>
                <p className="text-vatech-gray-mid text-xs mt-1">Нажмите «Обновить» после заполнения формы</p>
              </div>
            )}
          </div>
        </div>

        {/* Draw history */}
        <div className="vatech-card space-y-3">
          <p className="font-semibold text-vatech-dark text-sm">История розыгрышей ({results.length})</p>
          {results.length === 0 ? (
            <p className="text-vatech-gray-mid text-sm text-center py-4">Ещё ни одного розыгрыша</p>
          ) : (
            <ul className="space-y-2 max-h-[480px] overflow-y-auto">
              {results.map(r => (
                <li key={r.id} className="p-2.5 rounded-lg bg-vatech-gray-light">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-vatech-red">{r.prizeName}</p>
                      <p className="text-sm font-medium text-vatech-dark">{r.winnerName}</p>
                      <p className="text-xs text-vatech-gray-mid">{r.winnerPhone}{r.winnerClinic ? ` · ${r.winnerClinic}` : ""}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-vatech-gray-mid">
                        {new Date(r.drawnAt).toLocaleString("ru-RU", {day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}
                      </p>
                      {r.notified
                        ? <span className="text-xs text-green-500">✓ уведомлён</span>
                        : <span className="text-xs text-amber-500">без уведомления</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function HelpPanel() {
  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-xl font-bold text-vatech-dark">Справка</h1>

      {/* Bitrix */}
      <div className="vatech-card space-y-2">
        <SectionHead color="bg-vatech-red" title="Bitrix24 — Webhook URL" desc="" />
        <p className="text-sm text-vatech-gray-mid">Откройте Bitrix24 → Разработчикам → Входящий вебхук. Скопируйте URL вида:</p>
        <code className="block bg-vatech-gray-light rounded-lg px-3 py-2 text-xs font-mono text-vatech-dark break-all">
          https://ВАШ_ДОМЕН.bitrix24.ru/rest/1/КЛЮЧ/
        </code>
        <p className="text-sm text-vatech-gray-mid">Webhook используется для обеих форм (лиды и розыгрыш).</p>
      </div>

      {/* Yandex */}
      <div className="vatech-card space-y-3">
        <SectionHead color="bg-red-400" title="Яндекс — Таблицы и Формы" desc="" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-vatech-dark">ID таблицы</p>
          <p className="text-sm text-vatech-gray-mid">Откройте таблицу в браузере. ID — это часть URL между <code className="bg-vatech-gray-light px-1 rounded">/d/</code> и <code className="bg-vatech-gray-light px-1 rounded">/edit</code>:</p>
          <code className="block bg-vatech-gray-light rounded-lg px-3 py-2 text-xs font-mono text-vatech-dark break-all">
            docs.yandex.ru/docs/d/<span className="text-vatech-red font-bold">1abc2DEF3ghi…</span>/edit
          </code>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-vatech-dark">OAuth-токен</p>
          <p className="text-sm text-vatech-gray-mid">
            Получите токен на{" "}
            <a href="https://oauth.yandex.ru/" target="_blank" rel="noreferrer" className="text-vatech-red underline">oauth.yandex.ru</a>
            {" "}→ Создать приложение → права на Диск/Таблицы. Токен начинается с <code className="bg-vatech-gray-light px-1 rounded">y0_…</code>
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-vatech-dark">URL Яндекс.Формы</p>
          <p className="text-sm text-vatech-gray-mid">Скопируйте URL публикации формы:</p>
          <code className="block bg-vatech-gray-light rounded-lg px-3 py-2 text-xs font-mono text-vatech-dark break-all">
            https://forms.yandex.ru/surveys/XXXXX/answer/
          </code>
        </div>
      </div>

      {/* Bot settings */}
      <div className="vatech-card space-y-3">
        <SectionHead color="bg-green-500" title="Telegram-бот — Настройки" desc="" />
        <div className="space-y-2 text-sm">
          <HelpRow label="URL API бота" desc="Адрес сервера с ботом и порт 18824. Если оставить пустым — подставится автоматически из hostname страницы." example="http://103.113.71.160:18824" />
          <HelpRow label="Username бота" desc="Имя бота в Telegram без символа @. Используется для формирования ссылки на бота в форме." example="vatech_raffle_bot" />
          <HelpRow label="BOT_TOKEN" desc="Токен бота от @BotFather. Нужен только для справки — в .env на сервере должен быть прописан отдельно." example="123456789:AAFxxxxxxxxxxxxxxx" />
          <HelpRow label="ID администраторов" desc="Telegram user ID администраторов через запятую. Только они могут использовать команды /draw и /export. Получить свой ID можно через @userinfobot." example="123456789, 987654321" />
        </div>
      </div>

      {/* Bot commands */}
      <div className="vatech-card space-y-3">
        <SectionHead color="bg-sky-400" title="Команды Telegram-бота" desc="" />
        <div className="space-y-3">
          <BotCmd cmd="/start TOKEN" who="Участник" desc='Отправляется автоматически при переходе по ссылке из формы. Показывает приветственное сообщение с кнопкой "Получить номер участника".' />
          <BotCmd cmd="/export" who="Админ" desc="Отправляет CSV-файл со списком всех участников (номер, имя, телефон, дата регистрации)." />
          <BotCmd cmd="/count" who="Админ" desc="Показывает количество подтверждённых участников." />
          <BotCmd cmd="/list" who="Админ" desc="Список всех участников в чат." />
          <BotCmd cmd="/reset" who="Админ" desc="Удаляет всех участников из базы. Требует осторожности." />
        </div>
        <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-700 font-medium">⚠ Все команды кроме /start доступны только Telegram-аккаунтам, чьи ID указаны в поле «ID администраторов».</p>
        </div>
        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700 font-medium">ℹ Призы и розыгрыш управляются через вкладку <strong>Розыгрыш</strong> в этой админке. Бот автоматически отправит победителю сообщение подойти к стойке.</p>
        </div>
      </div>

      {/* Deploy */}
      <div className="vatech-card space-y-2">
        <SectionHead color="bg-gray-500" title="Деплой на сервере" desc="" />
        <p className="text-sm text-vatech-gray-mid">Запустите на сервере для обновления:</p>
        <div className="space-y-2">
          <div>
            <p className="text-xs font-semibold text-vatech-gray-mid mb-1">Форма</p>
            <code className="block bg-vatech-gray-light rounded-lg px-3 py-2 text-xs font-mono text-vatech-dark">
              cd ~/form_vatech && git pull origin main && docker-compose up -d --build
            </code>
          </div>
          <div>
            <p className="text-xs font-semibold text-vatech-gray-mid mb-1">Бот</p>
            <code className="block bg-vatech-gray-light rounded-lg px-3 py-2 text-xs font-mono text-vatech-dark">
              cd ~/form_vatech/raffle-bot && git pull origin main && docker-compose up -d --build
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

function HelpRow({ label, desc, example }: { label: string; desc: string; example: string }) {
  return (
    <div className="border-b border-vatech-border last:border-0 pb-2 last:pb-0">
      <p className="font-semibold text-vatech-dark">{label}</p>
      <p className="text-vatech-gray-mid text-xs mt-0.5">{desc}</p>
      <code className="block mt-1 bg-vatech-gray-light rounded px-2 py-1 text-xs font-mono text-vatech-gray">{example}</code>
    </div>
  );
}

function BotCmd({ cmd, who, desc }: { cmd: string; who: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 pt-0.5">
        <code className="bg-vatech-dark text-white text-xs font-mono px-2 py-1 rounded whitespace-nowrap">{cmd}</code>
      </div>
      <div>
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded mr-1.5 ${who === "Админ" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>{who}</span>
        <span className="text-xs text-vatech-gray-mid">{desc}</span>
      </div>
    </div>
  );
}


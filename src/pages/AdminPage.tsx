import { useState, useEffect } from "react";
import {
  Settings, Table, Save, Trash2, Download,
  Eye, EyeOff, RefreshCw, ChevronDown, ChevronUp, Gift, Ticket,
} from "lucide-react";
import { VatechLogo } from "../components/VatechLogo";
import { StatusBadge } from "../components/StatusBadge";
import { loadConfig, saveConfig } from "../services/config";
import { getSubmissions, clearSubmissions } from "../services/submissions";
import type { AdminConfig, Submission, FormType } from "../types";

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

type Tab = "lead" | "raffle" | "settings";

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === "1");
  const [tab, setTab] = useState<Tab>("lead");
  const [all, setAll] = useState<Submission[]>([]);
  const [config, setConfig] = useState<AdminConfig>(loadConfig);
  const [saved, setSaved] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!authed) return <LoginScreen onAuth={() => setAuthed(true)} />;

  const reload = () => setAll(getSubmissions());
  useEffect(reload, [tab]);

  const leads = all.filter((s) => s.formType === "lead");
  const raffles = all.filter((s) => s.formType === "raffle");
  const current = tab === "lead" ? leads : tab === "raffle" ? raffles : [];

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
          </nav>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {tab !== "settings" ? (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h1 className="text-xl font-bold text-vatech-dark">
                {tab === "lead" ? "Анкеты лидов" : "Участники розыгрыша"}
              </h1>
              <div className="flex gap-2">
                <button onClick={reload}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-vatech-border text-vatech-gray text-sm font-medium hover:border-vatech-red hover:text-vatech-red transition-colors">
                  <RefreshCw size={14} /> Обновить
                </button>
                <button onClick={() => exportCsv(tab as FormType)} disabled={!current.length}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-vatech-red text-white text-sm font-medium hover:bg-vatech-red-dark transition-colors disabled:opacity-50">
                  <Download size={14} /> CSV
                </button>
                <button onClick={() => handleClear(tab as FormType)} disabled={!current.length}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {current.length === 0 ? (
              <div className="vatech-card text-center py-16">
                <Table size={48} className="mx-auto text-vatech-border mb-4" />
                <p className="text-vatech-gray-mid font-medium">Записей пока нет</p>
              </div>
            ) : (
              <div className="space-y-3">
                {current.map((s) => (
                  <SubmissionRow key={s.id} s={s}
                    expanded={expanded === s.id}
                    onToggle={() => setExpanded(expanded === s.id ? null : s.id)} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <SettingsPanel config={config} setConfig={setConfig}
            showToken={showToken} setShowToken={setShowToken}
            saved={saved} onSave={handleSave} />
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
            <label className="vatech-label">URL Яндекс.Формы (лиды)</label>
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
        </div>
      </div>

      <button onClick={onSave} className="vatech-btn-primary flex items-center justify-center gap-2">
        <Save size={16} />{saved ? "Сохранено ✓" : "Сохранить настройки"}
      </button>
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


import { useState, useEffect, useRef } from "react";
import {
  Settings, Table, Save, Trash2, Download,
  Eye, EyeOff, RefreshCw, ChevronDown, ChevronUp, Gift, Ticket, HelpCircle,
  Trophy, Plus, X, Shuffle, CheckCircle, AlertCircle, Loader2,
} from "lucide-react";
import { VatechLogo } from "../components/VatechLogo";
import { StatusBadge } from "../components/StatusBadge";
import { loadConfig, saveConfig } from "../services/config";
import { getSubmissions, clearSubmissions } from "../services/submissions";
import {
  getPrizes, addPrize, deletePrize,
  getDrawResults, saveDrawResult,
  fetchBotParticipants, notifyWinner,
} from "../services/prizes";
import type { AdminConfig, Submission, FormType, Prize, DrawResult, BotParticipant } from "../types";

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
          <div className="space-y-6">
            <PrizeDrawPanel botUrl={config.raffleBotUrl} raffles={raffles} />
            <BotParticipantsList botUrl={config.raffleBotUrl} />
          </div>
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

// ── Bot Participants List ─────────────────────────────────────────────────────

function BotParticipantsList({ botUrl }: { botUrl: string }) {
  const [parts, setParts]     = useState<BotParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState(false);

  const load = async () => {
    setLoading(true);
    setErr(false);
    try { setParts(await fetchBotParticipants(botUrl)); }
    catch { setErr(true); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const exportCsvBot = () => {
    if (!parts.length) return;
    const rows = [
      ["№", "Имя", "Телефон", "Клиника", "Подтверждён в TG", "Дата"],
      ...parts.map(p => [
        p.id,
        p.name,
        p.phone,
        p.clinic,
        p.chat_id ? "Да" : "Нет",
        new Date(p.registered_at).toLocaleString("ru-RU"),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `vatech_raffle_bot_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold text-vatech-dark flex items-center gap-2">
          Участники розыгрыша
          <span className="text-xs font-normal text-vatech-gray-mid bg-vatech-gray-light px-2 py-0.5 rounded-full">
            {loading ? "…" : `${parts.length} подтверждено в боте`}
          </span>
        </h2>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-vatech-border text-vatech-gray text-sm hover:border-vatech-red hover:text-vatech-red transition-colors">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Обновить
          </button>
          <button onClick={exportCsvBot} disabled={!parts.length}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vatech-red text-white text-sm hover:bg-vatech-red-dark transition-colors disabled:opacity-50">
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      {err && (
        <div className="vatech-card border-amber-200 bg-amber-50 text-amber-700 text-sm py-3 px-4 mb-3">
          ⚠ Не удалось подключиться к боту. Проверьте URL бота в настройках.
        </div>
      )}

      {!err && !loading && parts.length === 0 ? (
        <div className="vatech-card text-center py-10">
          <Table size={40} className="mx-auto text-vatech-border mb-3" />
          <p className="text-vatech-gray-mid font-medium text-sm">Никто ещё не подтвердил участие в боте</p>
          <p className="text-vatech-gray-mid text-xs mt-1">Участники появятся после нажатия кнопки в Telegram</p>
        </div>
      ) : (
        <div className="space-y-2">
          {parts.map((p, idx) => (
            <div key={p.id} className="vatech-card py-3 px-4 flex items-center gap-4">
              <span className="text-sm font-bold text-vatech-gray-mid w-7 text-center">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-vatech-dark truncate">{p.name}</p>
                <p className="text-xs text-vatech-gray-mid">{p.phone}{p.clinic ? ` · ${p.clinic}` : ""}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {p.chat_id
                  ? <span className="text-xs text-green-600 font-medium">✓ TG</span>
                  : <span className="text-xs text-amber-500">без TG</span>}
                <p className="text-xs text-vatech-gray-mid mt-0.5">
                  {new Date(p.registered_at).toLocaleString("ru-RU", {day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Prize Draw Panel ──────────────────────────────────────────────────────────

function PrizeDrawPanel({ botUrl, raffles }: { botUrl: string; raffles: Submission[] }) {
  const [prizes, setPrizes]               = useState<Prize[]>(getPrizes);
  const [results, setResults]             = useState<DrawResult[]>(getDrawResults);
  const [newName, setNewName]             = useState("");
  const [drawing, setDrawing]             = useState<number | null>(null);
  const [drawingAll, setDrawingAll]       = useState(false);
  const [drawState, setDrawState]         = useState<"idle" | "loading" | "done" | "error">("idle");
  const [lastResult, setLastResult]       = useState<DrawResult | null>(null);
  const [errMsg, setErrMsg]               = useState("");
  const [botParts, setBotParts]           = useState<BotParticipant[]>([]);
  const [botLoading, setBotLoading]       = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const norm = (p: string) => p.replace(/\D/g, "");

  const loadBot = async () => {
    setBotLoading(true);
    try { setBotParts(await fetchBotParticipants(botUrl)); } catch { /* bot offline */ }
    finally { setBotLoading(false); }
  };
  useEffect(() => { loadBot(); }, []);

  const refresh = () => { setPrizes(getPrizes()); setResults(getDrawResults()); };

  // Eligible pool = bot confirmed + localStorage not in bot, minus previous winners
  const buildPool = (currentResults: DrawResult[]) => {
    const wonPhones = new Set(currentResults.map(r => norm(r.winnerPhone)));
    type PoolEntry = { name: string; phone: string; clinic: string; chat_id?: number | null };
    const pool: PoolEntry[] = [];
    const poolPhones = new Set<string>();

    for (const bp of botParts) {
      const p = norm(bp.phone);
      if (!wonPhones.has(p)) { pool.push(bp); poolPhones.add(p); }
    }
    for (const s of raffles) {
      const p = norm(s.phone);
      if (!poolPhones.has(p) && !wonPhones.has(p)) {
        pool.push({ name: s.firstName, phone: s.phone, clinic: s.clinic ?? "" });
        poolPhones.add(p);
      }
    }
    return pool;
  };

  const doDrawOne = async (prize: Prize, currentResults: DrawResult[]): Promise<DrawResult | null> => {
    const pool = buildPool(currentResults);
    if (pool.length === 0) return null;
    const winner = pool[Math.floor(Math.random() * pool.length)];
    let notified = false;
    if (winner.chat_id) {
      notified = await notifyWinner(botUrl, winner.chat_id, winner.name, prize.name);
    }
    const result: DrawResult = {
      id: Date.now(),
      prizeName: prize.name,
      winnerId: 0,
      winnerName: winner.name,
      winnerPhone: winner.phone,
      winnerClinic: winner.clinic,
      notified,
      drawnAt: new Date().toISOString(),
    };
    saveDrawResult(result);
    deletePrize(prize.id);
    return result;
  };

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    addPrize(name);
    setNewName("");
    refresh();
    inputRef.current?.focus();
  };

  const handleDelete = (id: number) => { deletePrize(id); refresh(); };

  const handleDraw = async (prize: Prize) => {
    setDrawing(prize.id);
    setDrawState("loading");
    setErrMsg("");
    const currentResults = getDrawResults();
    if (buildPool(currentResults).length === 0) {
      setErrMsg("Нет доступных участников (все уже выиграли или список пуст).");
      setDrawState("error");
      return;
    }
    try {
      const result = await doDrawOne(prize, currentResults);
      if (!result) { setErrMsg("Нет доступных участников."); setDrawState("error"); return; }
      setLastResult(result);
      setDrawState("done");
      refresh();
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Ошибка розыгрыша");
      setDrawState("error");
    }
  };

  const handleDrawAll = async () => {
    const allPrizes = getPrizes();
    if (!allPrizes.length) return;
    setDrawingAll(true);
    setDrawState("loading");
    setErrMsg("");
    let currentResults = getDrawResults();
    let lastRes: DrawResult | null = null;
    for (const prize of allPrizes) {
      if (buildPool(currentResults).length === 0) {
        setErrMsg(`Не хватает участников для «${prize.name}».`);
        setDrawState("error");
        setDrawingAll(false);
        refresh();
        return;
      }
      try {
        const result = await doDrawOne(prize, currentResults);
        if (result) { currentResults = [result, ...currentResults]; lastRes = result; }
      } catch (e) {
        setErrMsg(e instanceof Error ? e.message : "Ошибка розыгрыша");
        setDrawState("error");
        setDrawingAll(false);
        refresh();
        return;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    setLastResult(lastRes);
    setDrawState("done");
    setDrawingAll(false);
    refresh();
  };

  const resetDraw = () => { setDrawing(null); setDrawState("idle"); setLastResult(null); setErrMsg(""); };

  const isBusy = drawState === "loading";
  const eligibleCount = buildPool(results);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-vatech-red" />
          <h1 className="text-xl font-bold text-vatech-dark">Розыгрыш призов</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-vatech-gray-mid">
          <button onClick={loadBot} disabled={botLoading} title="Обновить из бота"
            className="hover:text-vatech-red transition-colors">
            <RefreshCw size={13} className={botLoading ? "animate-spin" : ""} />
          </button>
          <span>В боте: <strong className="text-vatech-dark">{botParts.length}</strong></span>
          <span>·</span>
          <span>Доступны: <strong className={eligibleCount.length === 0 ? "text-red-500" : "text-green-600"}>{eligibleCount.length}</strong></span>
        </div>
      </div>

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
                : <p className="text-amber-600 text-xs mt-1">⚠ Telegram-уведомление не отправлено</p>}
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
        {/* Prizes queue */}
        <div className="vatech-card space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-vatech-dark text-sm">Призы в очереди ({prizes.length})</p>
            {prizes.length > 1 && (
              <button onClick={handleDrawAll} disabled={isBusy || eligibleCount.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-vatech-red text-vatech-red text-xs font-semibold hover:bg-vatech-red hover:text-white transition-colors disabled:opacity-40">
                {drawingAll ? <><Loader2 size={12} className="animate-spin" /> Разыгрываем…</> : <><Shuffle size={12} /> Все сразу</>}
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <input ref={inputRef} value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()} placeholder="Название приза…"
              className="vatech-input text-sm py-2 flex-1" />
            <button onClick={handleAdd} disabled={!newName.trim()}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-vatech-red text-white text-sm font-medium hover:bg-vatech-red-dark transition-colors disabled:opacity-40">
              <Plus size={15} /> Добавить
            </button>
          </div>

          {prizes.length === 0 ? (
            <p className="text-vatech-gray-mid text-sm text-center py-4">Список пуст. Добавьте первый приз 👆</p>
          ) : (
            <ul className="space-y-2">
              {prizes.map((prize, idx) => (
                <li key={prize.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-vatech-gray-light group">
                  <span className="text-xs font-bold text-vatech-gray-mid w-5 text-center">{idx + 1}</span>
                  <span className="flex-1 text-sm font-medium text-vatech-dark">{prize.name}</span>
                  <button onClick={() => handleDraw(prize)} disabled={isBusy || eligibleCount.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vatech-red text-white text-xs font-semibold hover:bg-vatech-red-dark transition-colors disabled:opacity-60">
                    {drawState === "loading" && drawing === prize.id
                      ? <><Loader2 size={12} className="animate-spin" /> Розыгрыш…</>
                      : <><Shuffle size={12} /> Розыгрыш</>}
                  </button>
                  <button onClick={() => handleDelete(prize.id)} disabled={isBusy}
                    className="text-vatech-border hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:pointer-events-none">
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Draw history */}
        <div className="vatech-card space-y-3">
          <p className="font-semibold text-vatech-dark text-sm">История розыгрышей</p>
          {results.length === 0 ? (
            <p className="text-vatech-gray-mid text-sm text-center py-4">Ещё ни одного розыгрыша</p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto">
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


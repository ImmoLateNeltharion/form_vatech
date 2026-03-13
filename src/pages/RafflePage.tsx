import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Ticket, ChevronRight } from "lucide-react";
import { VatechLogo } from "../components/VatechLogo";
import { FormField } from "../components/FormField";
import { PhoneInput } from "../components/PhoneInput";
import { AnimatedCheck } from "../components/AnimatedCheck";
import { Confetti } from "../components/Confetti";
import { sendRaffleToBitrix } from "../services/bitrix";
import { addRaffleSubmission } from "../services/submissions";
import { sendRaffleToBot } from "../services/raffleBot";
import { loadConfig } from "../services/config";
import type { RaffleFormData } from "../types";
import { Footer } from "./FormPage";

const schema = z.object({
  firstName: z.string().min(2, "Введите имя"),
  phone: z.string().regex(/^\+7\d{10}$/, "Введите номер полностью"),
  clinic: z.string().optional().default(""),
  consent: z.literal(true, { error: "Необходимо согласие на обработку данных" }),
});

type Schema = z.infer<typeof schema>;
type Status = "idle" | "loading" | "success" | "error";

export default function RafflePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [submittedName, setSubmittedName] = useState("");

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "+7" },
  });

  const [botToken, setBotToken] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState("");

  const onSubmit = async (values: Schema) => {
    setStatus("loading");
    const config = loadConfig();
    const data: RaffleFormData = {
      firstName: values.firstName,
      phone: values.phone,
      clinic: values.clinic ?? "",
      consent: values.consent,
    };
    try {
      const [bitrixOk, token] = await Promise.all([
        sendRaffleToBitrix(config.bitrixWebhookUrl, data),
        sendRaffleToBot(config.raffleBotUrl, data),
      ]);
      addRaffleSubmission(data, bitrixOk, false);
      setSubmittedName(values.firstName);
      setBotToken(token);
      setBotUsername(config.raffleBotUsername || "vsuet_ctf_bot");
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") return (
    <SuccessScreen
      name={submittedName}
      botToken={botToken}
      botUsername={botUsername}
      onBack={() => { setStatus("idle"); setBotToken(null); }}
    />
  );

  return (
    <div className="min-h-screen bg-vatech-gray-light flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10 animate-slide-down">
        <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <VatechLogo className="h-9 w-auto" />
          <a href="/" className="text-xs font-semibold text-vatech-gray-mid hover:text-vatech-red transition-colors">
            ← Анкета лида
          </a>
        </div>
      </header>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #CC1234 100%)" }} className="text-white overflow-hidden">
        <div className="max-w-2xl mx-auto px-5 py-10">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1 text-sm font-semibold mb-4 animate-fade-in-up">
            <Ticket size={14} /> Розыгрыш билетов
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight mb-3 animate-fade-in-up anim-delay-100">
            🎟 Участвуйте в розыгрыше<br />билетов на вечернее шоу!
          </h1>
          <p className="text-white/85 text-sm sm:text-base leading-relaxed animate-fade-in-up anim-delay-200">
            Победитель определяется автоматически через чат-бот.
            Количество билетов <strong className="text-white">ограничено</strong>.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2 text-sm font-bold animate-fade-in-up anim-delay-300">
            🕔 Розыгрыш — 28 мая в 17:00
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-5 py-8">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

          <div className="bg-white rounded-2xl border border-vatech-border p-5 sm:p-6 space-y-4 animate-fade-in-up anim-delay-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Ваше имя" required error={errors.firstName?.message}>
                <input {...register("firstName")} placeholder="Имя"
                  className={`vatech-input ${errors.firstName ? "error" : ""}`} />
              </FormField>
              <FormField label="Телефон" required error={errors.phone?.message}>
                <Controller name="phone" control={control} render={({ field }) => (
                  <PhoneInput value={field.value} onChange={field.onChange} onBlur={field.onBlur}
                    className={`vatech-input ${errors.phone ? "error" : ""}`} />
                )} />
              </FormField>
              <FormField label="Клиника / организация" error={errors.clinic?.message}>
                <input {...register("clinic")} placeholder="Необязательно"
                  className="vatech-input" />
              </FormField>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-vatech-border p-5 animate-fade-in-up anim-delay-400">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" {...register("consent")}
                className="mt-0.5 w-4 h-4 accent-vatech-red flex-shrink-0" />
              <span className="text-sm text-vatech-gray leading-relaxed">
                Я даю согласие на обработку моих персональных данных в соответствии с{" "}
                <a href="https://www.vatechrussia.com/policy/" target="_blank" rel="noopener noreferrer"
                  className="text-vatech-red underline hover:no-underline">
                  Политикой конфиденциальности
                </a>{" "}
                и Федеральным законом № 152-ФЗ.
                <span className="text-vatech-red ml-0.5">*</span>
              </span>
            </label>
            {errors.consent && <p className="error-text mt-2 ml-7">{errors.consent.message}</p>}
          </div>

          <div className="animate-fade-in-up anim-delay-500">
            <button type="submit" disabled={status === "loading"}
              className="vatech-btn-primary flex items-center justify-center gap-2">
              {status === "loading"
                ? <><Loader2 size={18} className="animate-spin" /> Отправка…</>
                : <><Ticket size={18} /> Участвовать в розыгрыше <ChevronRight size={16} /></>}
            </button>
            {status === "error" && (
              <p className="text-vatech-red text-sm text-center font-medium mt-3">Ошибка. Попробуйте ещё раз.</p>
            )}
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}

function SuccessScreen({ name, botToken, botUsername, onBack }: {
  name: string;
  botToken: string | null;
  botUsername: string;
  onBack: () => void;
}) {
  const deepLink = botToken ? `https://t.me/${botUsername}?start=${botToken}` : null;
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-vatech-gray-light flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-5 py-3.5">
          <VatechLogo className="h-9 w-auto" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="relative max-w-md w-full">
          <Confetti />

          <div
            className="relative z-10 bg-white rounded-3xl shadow-card-hover border border-green-100 px-8 pt-10 pb-8 text-center overflow-hidden"
            style={{ animation: "successCardIn 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400" />

            <AnimatedCheck />

            <h2 className="text-2xl font-extrabold text-vatech-dark mt-4 mb-1 animate-fade-in-up anim-delay-300">
              Спасибо, {name}!
            </h2>
            <p className="text-vatech-gray-mid text-sm animate-fade-in-up anim-delay-400">
              Вы зарегистрированы в розыгрыше.
            </p>

            <div className="mt-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-4 text-left space-y-3 animate-fade-in-up anim-delay-500">
              <p className="text-xs font-bold text-vatech-dark uppercase tracking-widest mb-1">Пока ждёте розыгрыша</p>
              {[
                { icon: "🤖", text: <>Победитель определяется <strong>автоматически через чат-бот</strong></> },
                { icon: "📲", text: <>Подпишитесь на соцсети → <strong>стикер-пак или ежедневник</strong></> },
                { icon: "🎁", text: <>Заполните анкету лида → <strong>брендированная термокружка</strong></> },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-base mt-px leading-none">{item.icon}</span>
                  <span className="text-sm text-vatech-gray leading-snug">{item.text}</span>
                </div>
              ))}
            </div>

            {deepLink && (
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="vatech-btn-primary mt-5 flex items-center justify-center gap-2 animate-fade-in-up anim-delay-600"
                style={{ background: "#229ED9" }}
              >
                <span className="text-lg leading-none">✈️</span>
                Получить номер участника в Telegram
              </a>
            )}

            <div className="mt-4 inline-flex items-center gap-2 bg-vatech-red/8 border border-vatech-red/20 rounded-full px-4 py-2 animate-fade-in-up anim-delay-700">
              <span className="text-base">🍀</span>
              <span className="text-sm font-semibold text-vatech-red">Желаем удачи в розыгрыше!</span>
            </div>

            <button onClick={onBack} className="vatech-btn-primary mt-5 animate-fade-in-up anim-delay-800">
              Зарегистрировать следующего участника
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

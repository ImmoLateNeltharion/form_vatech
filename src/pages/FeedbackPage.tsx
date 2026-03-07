import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { VatechLogo } from "../components/VatechLogo";
import { FormField } from "../components/FormField";
import { PhoneInput } from "../components/PhoneInput";
import { AnimatedCheck } from "../components/AnimatedCheck";
import { Confetti } from "../components/Confetti";
import { loadConfig } from "../services/config";
import { Footer } from "./FormPage";

const schema = z.object({
  name: z.string().min(2, "Введите имя"),
  phone: z.string().regex(/^\+7\d{10}$/, "Введите номер полностью"),
  email: z.string().email("Некорректный email").or(z.literal("")).optional().default(""),
  message: z.string().min(5, "Введите сообщение"),
  consent: z.literal(true, { error: "Необходимо согласие на обработку данных" }),
});

type Schema = z.infer<typeof schema>;
type Status = "idle" | "loading" | "success" | "error";

async function sendFeedback(cfg: ReturnType<typeof loadConfig>, data: Schema): Promise<{ bitrix: boolean; yandex: boolean }> {
  const results = { bitrix: false, yandex: false };

  // Bitrix24
  if (cfg.bitrixWebhookUrl) {
    try {
      const params = new URLSearchParams({
        TITLE: `Обратная связь: ${data.name}`,
        NAME: data.name,
        PHONE: JSON.stringify([{ VALUE: data.phone, VALUE_TYPE: "WORK" }]),
        EMAIL: JSON.stringify([{ VALUE: data.email ?? "", VALUE_TYPE: "WORK" }]),
        COMMENTS: data.message,
        SOURCE_ID: "WEB",
        SOURCE_DESCRIPTION: "Форма обратной связи vatechrussia.com",
      });
      const res = await fetch(
        `${cfg.bitrixWebhookUrl.replace(/\/$/, "")}/crm.lead.add.json?${params}`,
        { method: "POST" }
      );
      results.bitrix = res.ok;
    } catch { /* silent */ }
  }

  // Yandex Sheet (feedback uses yandexFeedbackSheetId)
  const sheetId = cfg.yandexFeedbackSheetId;
  const token = cfg.yandexToken;
  if (sheetId && token) {
    try {
      const now = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
      const res = await fetch(
        `https://sheets.yandex.net/api/v1/spreadsheets/${sheetId}/values/A1:append`,
        {
          method: "POST",
          headers: { Authorization: `OAuth ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            values: [[now, data.name, data.phone, data.email ?? "", data.message]],
            valueInputOption: "USER_ENTERED",
          }),
        }
      );
      results.yandex = res.ok;
    } catch { /* silent */ }
  }

  return results;
}

export default function FeedbackPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [submittedName, setSubmittedName] = useState("");

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "+7" },
  });

  const onSubmit = async (values: Schema) => {
    setStatus("loading");
    try {
      await sendFeedback(loadConfig(), values);
      setSubmittedName(values.name);
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-vatech-gray-light flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="relative max-w-md w-full">
            <Confetti />
            <div
              className="relative z-10 bg-white rounded-3xl shadow-card-hover border border-green-100 px-8 pt-10 pb-8 text-center overflow-hidden"
              style={{ animation: "successCardIn 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400" />

              <AnimatedCheck />

              <h2 className="text-2xl font-extrabold text-vatech-dark mt-4 mb-2 animate-fade-in-up anim-delay-300">
                Спасибо, {submittedName}!
              </h2>
              <p className="text-vatech-gray-mid text-sm leading-relaxed animate-fade-in-up anim-delay-400">
                Сообщение получено. Мы свяжемся с вами в течение рабочего дня.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-2 animate-fade-in-up anim-delay-500">
                <span className="text-base">📞</span>
                <span className="text-sm font-medium text-blue-700">Ожидайте звонка специалиста</span>
              </div>
              <button
                onClick={() => setStatus("idle")}
                className="vatech-btn-primary mt-6 animate-fade-in-up anim-delay-600"
              >
                Отправить ещё раз
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vatech-gray-light flex flex-col">
      <Header />

      <div className="bg-vatech-red text-white overflow-hidden">
        <div className="max-w-xl mx-auto px-5 py-10">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-3 animate-fade-in-up">
            Обратная связь
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight mb-3 animate-fade-in-up anim-delay-100">
            Свяжитесь с нами
          </h1>
          <p className="text-white/85 text-sm sm:text-base leading-relaxed animate-fade-in-up anim-delay-200">
            Задайте вопрос или оставьте заявку — наш специалист ответит в течение рабочего дня.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-5 py-8">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

          <div className="bg-white rounded-2xl border border-vatech-border p-5 sm:p-6 space-y-4 animate-fade-in-up anim-delay-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Ваше имя" required error={errors.name?.message}>
                <input {...register("name")} placeholder="Имя"
                  className={`vatech-input ${errors.name ? "error" : ""}`} />
              </FormField>
              <FormField label="Телефон" required error={errors.phone?.message}>
                <Controller name="phone" control={control} render={({ field }) => (
                  <PhoneInput value={field.value} onChange={field.onChange} onBlur={field.onBlur}
                    className={`vatech-input ${errors.phone ? "error" : ""}`} />
                )} />
              </FormField>
            </div>
            <FormField label="E-mail" error={errors.email?.message}>
              <input {...register("email")} type="email" placeholder="info@clinic.ru"
                className={`vatech-input ${errors.email ? "error" : ""}`} />
            </FormField>
            <FormField label="Сообщение" required error={errors.message?.message}>
              <textarea {...register("message")} rows={5}
                placeholder="Ваш вопрос или сообщение…"
                className={`vatech-input resize-none ${errors.message ? "error" : ""}`} />
            </FormField>
          </div>

          <div className="bg-white rounded-2xl border border-vatech-border p-5 animate-fade-in-up anim-delay-300">
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

          <div className="animate-fade-in-up anim-delay-400">
            <button type="submit" disabled={status === "loading"}
              className="vatech-btn-primary flex items-center justify-center gap-2">
              {status === "loading"
                ? <><Loader2 size={18} className="animate-spin" /> Отправка…</>
                : <><Send size={16} /> Отправить сообщение</>}
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

function Header() {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10 animate-slide-down">
      <div className="max-w-xl mx-auto px-5 py-3.5 flex items-center justify-between">
        <VatechLogo className="h-9 w-auto" />
        <a href="https://www.vatechrussia.com" target="_blank" rel="noopener noreferrer"
          className="text-xs font-semibold text-vatech-gray-mid hover:text-vatech-red transition-colors">
          vatechrussia.com ↗
        </a>
      </div>
    </header>
  );
}

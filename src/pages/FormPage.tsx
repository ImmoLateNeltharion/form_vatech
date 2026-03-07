import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Gift, ChevronRight } from "lucide-react";
import { VatechLogo } from "../components/VatechLogo";
import { FormField } from "../components/FormField";
import { PhoneInput } from "../components/PhoneInput";
import { AnimatedCheck } from "../components/AnimatedCheck";
import { Confetti } from "../components/Confetti";
import { sendLeadToBitrix } from "../services/bitrix";
import { sendToYandexSheet, sendToYandexForm } from "../services/yandex";
import { addLeadSubmission } from "../services/submissions";
import { loadConfig } from "../services/config";
import type { LeadFormData } from "../types";

const PRODUCTS = [
  "Компьютерные томографы (КТ)",
  "Панорамные томографы (ОПТГ)",
  "Портативный / настенный рентген",
  "Радиовизиографы",
  "Интраоральная камера",
  "Программа для управления клиникой",
  "Программа для цефалометрического анализа",
  "CAD/CAM",
];

const schema = z.object({
  firstName: z.string().min(2, "Введите имя"),
  clinic: z.string().min(2, "Введите название клиники"),
  phone: z.string().regex(/^\+7\d{10}$/, "Введите номер полностью"),
  email: z.string().email("Некорректный email").or(z.literal("")).optional().default(""),
  city: z.string().min(2, "Введите город"),
  specialization: z.string().min(2, "Укажите специализацию"),
  products: z.array(z.string()).min(1, "Выберите хотя бы один продукт"),
  cooperation: z.string().optional().default(""),
  consent: z.literal(true, { error: "Необходимо согласие на обработку данных" }),
});

type Schema = z.infer<typeof schema>;
type Status = "idle" | "loading" | "success" | "error";

export default function FormPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [submittedName, setSubmittedName] = useState("");

  // Progressive disclosure — only ever goes false → true
  const [showSec02, setShowSec02] = useState(false);
  const [showSec03, setShowSec03] = useState(false);
  const [showConsent, setShowConsent] = useState(false);

  const sec02Ref = useRef<HTMLDivElement>(null);
  const sec03Ref = useRef<HTMLDivElement>(null);
  const consentRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, watch, setValue, control, formState: { errors }, reset } = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { products: [], phone: "+7" },
  });

  // Watch all fields for fill indicators + disclosure logic
  const firstName     = watch("firstName") ?? "";
  const specialization = watch("specialization") ?? "";
  const clinic        = watch("clinic") ?? "";
  const phone         = watch("phone") ?? "";
  const email         = watch("email") ?? "";
  const city          = watch("city") ?? "";
  const selectedProducts = watch("products") ?? [];

  // Section completion
  const sec01Done = firstName.trim().length >= 2 && specialization.trim().length >= 2 && clinic.trim().length >= 2;
  const sec02Done = /^\+7\d{10}$/.test(phone) && city.trim().length >= 2;
  const sec03Done = selectedProducts.length >= 1;

  // Smooth-scroll helper — waits one tick for the element to render
  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  useEffect(() => {
    if (sec01Done && !showSec02) { setShowSec02(true); scrollTo(sec02Ref); }
  }, [sec01Done]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sec02Done && !showSec03) { setShowSec03(true); scrollTo(sec03Ref); }
  }, [sec02Done]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sec03Done && !showConsent) { setShowConsent(true); scrollTo(consentRef); }
  }, [sec03Done]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleProduct = (p: string) => {
    const cur = selectedProducts;
    setValue(
      "products",
      cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p],
      { shouldValidate: true }
    );
  };

  const onSubmit = async (values: Schema) => {
    setStatus("loading");
    const config = loadConfig();
    const data: LeadFormData = {
      firstName: values.firstName,
      clinic: values.clinic,
      phone: values.phone,
      email: values.email ?? "",
      city: values.city,
      specialization: values.specialization,
      products: values.products,
      cooperation: values.cooperation ?? "",
      consent: values.consent,
    };
    try {
      const [bitrixOk, yandexOk] = await Promise.all([
        sendLeadToBitrix(config.bitrixWebhookUrl, data),
        config.yandexSheetId && config.yandexToken
          ? sendToYandexSheet(config.yandexSheetId, config.yandexToken, data as any)
          : config.yandexFormUrl
          ? sendToYandexForm(config.yandexFormUrl, data as any)
          : Promise.resolve(false),
      ]);
      addLeadSubmission(data, bitrixOk, yandexOk);
      setSubmittedName(values.firstName);
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") return <SuccessScreen name={submittedName} onBack={() => setStatus("idle")} />;

  // Per-field fill flags
  const f = {
    firstName:      firstName.trim().length >= 2,
    specialization: specialization.trim().length >= 2,
    clinic:         clinic.trim().length >= 2,
    phone:          /^\+7\d{10}$/.test(phone),
    email:          email.includes("@") && email.includes("."),
    city:           city.trim().length >= 2,
  };

  return (
    <div className="min-h-screen bg-vatech-gray-light flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10 animate-slide-down">
        <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <VatechLogo className="h-9 w-auto" />
          <a href="/raffle" className="text-xs font-semibold text-vatech-gray-mid hover:text-vatech-red transition-colors">
            Розыгрыш билетов →
          </a>
        </div>
      </header>

      <div className="bg-vatech-red text-white overflow-hidden">
        <div className="max-w-2xl mx-auto px-5 py-10">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 text-sm font-semibold mb-4 animate-fade-in-up">
            <Gift size={14} /> Анкета участника
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight mb-3 animate-fade-in-up anim-delay-100">
            🎁 Получите эксклюзивный<br />подарок от Vatech!
          </h1>
          <p className="text-white/85 text-sm sm:text-base leading-relaxed animate-fade-in-up anim-delay-200">
            Заполните анкету — получите <strong className="text-white">термокружку + аромакамень + ежедневник</strong>
            {" "}(или ежедневник за подписку на соцсети).
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-5 py-8">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

          {/* ── Section 01 — always visible ── */}
          <Section number="01" title="О вас" done={sec01Done} className="animate-fade-in-up anim-delay-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Ваше имя" required filled={f.firstName} error={errors.firstName?.message}>
                <input {...register("firstName")} placeholder="Имя"
                  className={`vatech-input ${errors.firstName ? "error" : f.firstName ? "filled" : ""}`} />
              </FormField>
              <FormField label="Специализация" required filled={f.specialization} error={errors.specialization?.message}>
                <input {...register("specialization")} placeholder="Хирург, ортопед, администратор…"
                  className={`vatech-input ${errors.specialization ? "error" : f.specialization ? "filled" : ""}`} />
              </FormField>
            </div>
            <FormField label="Название клиники / организации" required filled={f.clinic} error={errors.clinic?.message}>
              <input {...register("clinic")} placeholder="ООО «Стоматология»"
                className={`vatech-input ${errors.clinic ? "error" : f.clinic ? "filled" : ""}`} />
            </FormField>
          </Section>

          {/* ── Section 02 — appears once sec01 is complete ── */}
          {showSec02 && (
            <div ref={sec02Ref} className="scroll-mt-20">
              <Section number="02" title="Контакты" done={sec02Done} className="animate-fade-in-up">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Телефон" required filled={f.phone} error={errors.phone?.message}>
                    <Controller name="phone" control={control} render={({ field }) => (
                      <PhoneInput value={field.value} onChange={field.onChange} onBlur={field.onBlur}
                        className={`vatech-input ${errors.phone ? "error" : f.phone ? "filled" : ""}`} />
                    )} />
                  </FormField>
                  <FormField label="E-mail" filled={f.email} error={errors.email?.message}>
                    <input {...register("email")} type="email" placeholder="info@clinic.ru"
                      className={`vatech-input ${errors.email ? "error" : f.email ? "filled" : ""}`} />
                  </FormField>
                </div>
                <FormField label="Город / регион" required filled={f.city} error={errors.city?.message}>
                  <input {...register("city")} placeholder="Москва"
                    className={`vatech-input ${errors.city ? "error" : f.city ? "filled" : ""}`} />
                </FormField>
              </Section>
            </div>
          )}

          {/* ── Section 03 — appears once sec02 is complete ── */}
          {showSec03 && (
            <div ref={sec03Ref} className="scroll-mt-20">
              <Section number="03" title="Интересующее оборудование" done={sec03Done} className="animate-fade-in-up">
                <FormField label="Выберите продукт (можно несколько)" required error={errors.products?.message}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {PRODUCTS.map((p) => {
                      const checked = selectedProducts.includes(p);
                      return (
                        <button key={p} type="button" onClick={() => toggleProduct(p)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm font-medium
                            transition-all duration-200 hover:-translate-y-0.5
                            ${checked
                              ? "border-vatech-red bg-vatech-red-pale text-vatech-red shadow-sm scale-[1.01]"
                              : "border-vatech-border bg-white text-vatech-gray hover:border-vatech-red/40 hover:shadow-sm"}`}>
                          <span className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all duration-200
                            ${checked ? "bg-vatech-red border-vatech-red scale-110" : "border-vatech-gray-mid"}`}>
                            {checked && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </span>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </FormField>
                <div className="mt-1">
                  <FormField label="Сотрудничество с Vatech Центром" error={errors.cooperation?.message}>
                    <textarea {...register("cooperation")} rows={3}
                      placeholder="Пожелания, вопросы или описание потребностей…"
                      className="vatech-input resize-none" />
                  </FormField>
                </div>
              </Section>
            </div>
          )}

          {/* ── Consent + Submit — appears once sec03 is complete ── */}
          {showConsent && (
            <div ref={consentRef} className="scroll-mt-20 space-y-5 animate-fade-in-up">
              <div className="bg-white rounded-2xl border border-vatech-border p-5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" {...register("consent")}
                    className="mt-0.5 w-4 h-4 accent-vatech-red flex-shrink-0" />
                  <span className="text-sm text-vatech-gray leading-relaxed">
                    Я даю согласие на обработку моих персональных данных в соответствии с{" "}
                    <a href="https://www.vatechrussia.com/policy/" target="_blank" rel="noopener noreferrer"
                      className="text-vatech-red underline hover:no-underline">
                      Политикой конфиденциальности
                    </a>{" "}
                    и Федеральным законом № 152-ФЗ «О персональных данных».
                    <span className="text-vatech-red ml-0.5">*</span>
                  </span>
                </label>
                {errors.consent && <p className="error-text mt-2 ml-7">{errors.consent.message}</p>}
              </div>

              <div>
                <button type="submit" disabled={status === "loading"} className="vatech-btn-primary flex items-center justify-center gap-2">
                  {status === "loading"
                    ? <><Loader2 size={18} className="animate-spin" /> Отправка…</>
                    : <><Gift size={18} /> Получить подарок <ChevronRight size={16} /></>}
                </button>
                {status === "error" && (
                  <p className="text-vatech-red text-sm text-center font-medium mt-3">Ошибка отправки. Попробуйте ещё раз.</p>
                )}
              </div>
            </div>
          )}

        </form>
      </main>
      <Footer />
    </div>
  );
}

// ── Section component ─────────────────────────────────────────────────────────

function Section({ number, title, children, done = false, className = "" }: {
  number: string; title: string; children: React.ReactNode; done?: boolean; className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border transition-colors duration-500 p-5 sm:p-6 space-y-4
      ${done ? "border-green-300" : "border-vatech-border"} ${className}`}>
      <div className={`flex items-center gap-3 pb-2 border-b transition-colors duration-500
        ${done ? "border-green-200" : "border-vatech-border"}`}>
        <span className={`w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0
          transition-all duration-500 ${done ? "bg-green-500 scale-110" : "bg-vatech-red"}`}>
          {done ? (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : number}
        </span>
        <h2 className={`text-xs font-bold uppercase tracking-widest transition-colors duration-500
          ${done ? "text-green-700" : "text-vatech-dark"}`}>
          {title}
        </h2>
        {done && (
          <span className="ml-auto text-xs font-semibold text-green-500 animate-fade-in-up">
            Заполнено ✓
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({ name, onBack }: { name: string; onBack: () => void }) {
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
              Анкета принята. Ваш номерок — у стойки регистрации.
            </p>

            <div className="mt-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-4 text-left space-y-3 animate-fade-in-up anim-delay-500">
              <p className="text-xs font-bold text-vatech-dark uppercase tracking-widest mb-1">Подойдите к стойке с подарками</p>
              {[
                { icon: "💬", text: <>Подпишитесь на <strong>Telegram</strong> → стикер-пак</> },
                { icon: "📸", text: <>Подпишитесь на <strong>Instagram</strong> → ежедневник</> },
                { icon: "🎁", text: <>Анкета заполнена → <strong>термокружка + аромакамень + ежедневник</strong></> },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-base mt-px leading-none">{item.icon}</span>
                  <span className="text-sm text-vatech-gray leading-snug">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 inline-flex items-center gap-2 bg-vatech-red/8 border border-vatech-red/20 rounded-full px-4 py-2 animate-fade-in-up anim-delay-600">
              <span className="text-base">🎟</span>
              <span className="text-sm font-semibold text-vatech-red">Розыгрыш 28 мая в 17:00</span>
            </div>

            <button onClick={onBack} className="vatech-btn-primary mt-6 animate-fade-in-up anim-delay-700">
              Заполнить ещё одну анкету
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

export function Footer() {
  return (
    <footer className="bg-white border-t border-vatech-border">
      <div className="max-w-2xl mx-auto px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-vatech-gray-mid">
        <span>© {new Date().getFullYear()} Vatech Russia</span>
        <a href="https://www.vatechrussia.com" target="_blank" rel="noopener noreferrer"
          className="text-vatech-red hover:underline">vatechrussia.com</a>
      </div>
    </footer>
  );
}

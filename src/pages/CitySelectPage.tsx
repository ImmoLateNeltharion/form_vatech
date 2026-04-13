import { useNavigate } from "react-router-dom";
import { VatechLogo } from "../components/VatechLogo";
import { Footer } from "./FormPage";

const CITIES = [
  {
    key: "krasnodar",
    label: "Краснодар",
    emoji: "🌿",
    date: "28 мая",
  },
  {
    key: "moscow",
    label: "Москва",
    emoji: "🏙",
    date: "28 мая",
  },
];

export default function CitySelectPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-vatech-gray-light flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10 animate-slide-down">
        <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <VatechLogo className="h-9 w-auto" />
        </div>
      </header>

      <div className="bg-vatech-red text-white overflow-hidden">
        <div className="max-w-2xl mx-auto px-5 py-10">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 text-sm font-semibold mb-4 animate-fade-in-up">
            📍 Выберите ваш город
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight mb-3 animate-fade-in-up anim-delay-100">
            🎁 Заполните анкету — получите<br />брендированную термокружку
          </h1>
          <p className="text-white/85 text-sm sm:text-base leading-relaxed animate-fade-in-up anim-delay-200">
            Фирменный ежедневник или стикерпак — за подписку на соцсети{" "}
            <span className="text-white/60">(предложение ограничено)</span>
          </p>
        </div>
      </div>

      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-4 animate-fade-in-up anim-delay-200">
          <p className="text-center text-sm font-semibold text-vatech-gray-mid uppercase tracking-widest mb-6">
            В каком городе проходит выставка?
          </p>
          {CITIES.map((city) => (
            <button
              key={city.key}
              onClick={() => navigate(`/${city.key}`)}
              className="w-full flex items-center gap-5 bg-white border-2 border-vatech-border rounded-2xl px-6 py-5
                hover:border-vatech-red hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 group"
            >
              <span className="text-4xl">{city.emoji}</span>
              <div className="text-left flex-1">
                <div className="text-lg font-extrabold text-vatech-dark group-hover:text-vatech-red transition-colors">
                  {city.label}
                </div>
                <div className="text-xs text-vatech-gray-mid mt-0.5">
                  Выставка {city.date} · Розыгрыш в 17:00
                </div>
              </div>
              <svg className="text-vatech-gray-mid group-hover:text-vatech-red transition-colors" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}

import { BrowserRouter, Routes, Route } from "react-router-dom";
import CitySelectPage from "./pages/CitySelectPage";
import FormPage from "./pages/FormPage";
import RafflePage from "./pages/RafflePage";
import FeedbackPage from "./pages/FeedbackPage";
import AdminPage from "./pages/AdminPage";
import { loadConfig } from "./services/config";

function KrasnodarForm() {
  const cfg = loadConfig();
  return <FormPage cityName="Краснодар" cityYandexFormUrl={cfg.yandexFormUrlKrasnodar} />;
}

function MoscowForm() {
  const cfg = loadConfig();
  return <FormPage cityName="Москва" cityYandexFormUrl={cfg.yandexFormUrlMoscow} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CitySelectPage />} />
        <Route path="/krasnodar" element={<KrasnodarForm />} />
        <Route path="/moscow" element={<MoscowForm />} />
        <Route path="/raffle" element={<RafflePage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

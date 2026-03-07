import { BrowserRouter, Routes, Route } from "react-router-dom";
import FormPage from "./pages/FormPage";
import RafflePage from "./pages/RafflePage";
import FeedbackPage from "./pages/FeedbackPage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FormPage />} />
        <Route path="/raffle" element={<RafflePage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

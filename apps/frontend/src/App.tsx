import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import "./App.css";
// import { Landing } from './pages/Landing';
import { TeachingSession } from "./pages/TeachSession";
import { Landing } from "./pages/Landing";
import { routes } from "./routes";

function AppRoutes() {
  const location = useLocation();

  return (
    <Routes location={location} key={location.pathname}>
      <Route path={routes.landing} element={<Landing />} />
      <Route path={routes.demo} element={<TeachingSession />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;

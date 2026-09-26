import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SplashScreen } from "@capacitor/splash-screen";
import { App } from "./App";
import "./styles.css";

void SplashScreen.hide().catch(() => undefined);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

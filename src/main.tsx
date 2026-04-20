import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";
import App from "./App";
import "./styles/global.css";

gsap.registerPlugin(MotionPathPlugin, useGSAP);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

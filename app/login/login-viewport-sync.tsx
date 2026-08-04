"use client";

import { useEffect } from "react";

export function LoginViewportSync() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const sync = () => {
      const visibleHeight = Math.round(viewport?.height ?? window.innerHeight);
      root.style.setProperty("--login-viewport-height", `${visibleHeight}px`);
      root.classList.toggle("login-keyboard-open", window.innerHeight - visibleHeight > 120);
    };
    sync();
    window.addEventListener("resize", sync);
    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    return () => {
      window.removeEventListener("resize", sync);
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
      root.classList.remove("login-keyboard-open");
      root.style.removeProperty("--login-viewport-height");
    };
  }, []);

  return null;
}

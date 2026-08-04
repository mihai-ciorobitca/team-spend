"use client";

import { useEffect, useRef } from "react";

export function LoginViewportSync() {
  const largestVisibleHeight = useRef(0);
  const focusFallbackUntil = useRef(0);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const sync = () => {
      const visibleHeight = Math.round(viewport?.height ?? window.innerHeight);
      const visibleWidth = Math.round(viewport?.width ?? window.innerWidth);
      const offsetTop = Math.round(viewport?.offsetTop ?? 0);
      const offsetLeft = Math.round(viewport?.offsetLeft ?? 0);
      largestVisibleHeight.current = Math.max(largestVisibleHeight.current, visibleHeight);
      const keyboardHeight = Math.max(
        window.innerHeight - visibleHeight,
        largestVisibleHeight.current - visibleHeight,
      );
      const keyboardOpen = keyboardHeight > 120 || Date.now() < focusFallbackUntil.current;

      root.style.setProperty("--login-viewport-height", `${visibleHeight}px`);
      root.style.setProperty("--login-viewport-width", `${visibleWidth}px`);
      root.style.setProperty("--login-viewport-top", `${offsetTop}px`);
      root.style.setProperty("--login-viewport-left", `${offsetLeft}px`);
      root.classList.toggle("login-keyboard-open", keyboardOpen);
      root.classList.toggle("login-keyboard-tight", keyboardOpen && visibleHeight < 460);
      root.classList.toggle("login-keyboard-short", keyboardOpen && visibleHeight < 360);

      if (!keyboardOpen) {
        const card = document.querySelector<HTMLElement>(".login-card");
        if (card) {
          root.classList.add("login-measuring-card");
          root.style.removeProperty("--login-card-resting-height");
          void card.offsetHeight;
          root.style.setProperty("--login-card-resting-height", `${Math.ceil(card.scrollHeight)}px`);
          root.classList.remove("login-measuring-card");
        }
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof HTMLInputElement && event.target.closest(".login-form")) {
        focusFallbackUntil.current = Date.now() + 700;
        sync();
        window.setTimeout(sync, 750);
      }
    };
    const onFocusOut = () => {
      window.setTimeout(() => {
        if (!(document.activeElement instanceof HTMLInputElement) || !document.activeElement.closest(".login-form")) {
          focusFallbackUntil.current = 0;
          sync();
        }
      }, 0);
    };

    sync();
    window.addEventListener("resize", sync);
    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      window.removeEventListener("resize", sync);
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      root.classList.remove("login-keyboard-open");
      root.classList.remove("login-keyboard-tight");
      root.classList.remove("login-keyboard-short");
      root.classList.remove("login-measuring-card");
      root.style.removeProperty("--login-viewport-height");
      root.style.removeProperty("--login-viewport-width");
      root.style.removeProperty("--login-viewport-top");
      root.style.removeProperty("--login-viewport-left");
      root.style.removeProperty("--login-card-resting-height");
    };
  }, []);

  return null;
}

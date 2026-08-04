"use client";

import { useState } from "react";

export function PasswordField() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-control">
      <input
        id="site-password"
        name="password"
        type={visible ? "text" : "password"}
        autoComplete="current-password"
        required
        placeholder="Enter shared password"
      />
      <button
        className="password-toggle"
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        <span className={`password-eye ${visible ? "visible" : ""}`} aria-hidden="true" />
      </button>
    </div>
  );
}

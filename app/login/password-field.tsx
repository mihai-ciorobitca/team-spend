"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordField() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-control">
      <input
        id="site-password"
        name="password"
        type={visible ? "text" : "password"}
        autoComplete="current-password"
        maxLength={128}
        required
        placeholder="Enter your password"
      />
      <button
        className="password-toggle"
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={19} strokeWidth={1.8} aria-hidden="true" /> : <Eye size={19} strokeWidth={1.8} aria-hidden="true" />}
      </button>
    </div>
  );
}

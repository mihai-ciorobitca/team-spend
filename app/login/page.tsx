import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: { absolute: "Sign in to Peptiking" },
  description: "Use your team email and shared workspace password.",
};

function safeNext(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate?.startsWith("/") || candidate.startsWith("//")) return "/";
  return candidate;
}

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string; setup?: string; next?: string | string[] }>;
}) {
  const params = await searchParams;
  const isConfigured = Boolean(process.env.SITE_PASSWORD);
  const showSetup = params.setup === "1" || !isConfigured;
  const errorMessage = params.error === "service"
    ? "The team directory is temporarily unavailable. Try again shortly."
    : params.error
      ? "That email or password is not correct."
      : null;

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-card-header">
          <div className="login-brand"><Image className="brand-logo" src="/peptiking-logo.avif" alt="Peptiking" width={240} height={168} priority /></div>
          <div className="login-lock" aria-hidden="true"><span /></div>
        </div>
        <p className="eyebrow">Private workspace</p>
        <h1>Sign in to Peptiking.</h1>
        <p className="login-copy">Use your team email and the shared workspace password. Your member role determines what you can access.</p>

        {showSetup ? (
          <div className="login-alert setup" role="alert">
            Set <code>SITE_PASSWORD</code> in your environment variables, then redeploy the app.
          </div>
        ) : (
          <form className="login-form" action="/api/site-login" method="post">
            <input type="hidden" name="next" value={safeNext(params.next)} />
            <label htmlFor="site-email">Email</label>
            <input id="site-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required placeholder="name@peptikingmedia.com" />
            <label htmlFor="site-password">Password</label>
            <input id="site-password" name="password" type="password" autoComplete="current-password" required placeholder="Enter shared password" />
            {errorMessage && <p className="login-error" role="alert">{errorMessage}</p>}
            <button className="primary-button dark full" type="submit">Sign in</button>
          </form>
        )}
        <p className="login-footnote">Protected access · Receipt proof stays private</p>
      </section>
    </main>
  );
}

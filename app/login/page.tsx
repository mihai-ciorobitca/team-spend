import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Unlock Peptiking" },
  description: "Enter the team password to continue.",
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

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-brand"><span className="brand-mark">P</span><span>Peptiking</span></div>
        <div className="login-lock" aria-hidden="true"><span /></div>
        <p className="eyebrow">Private workspace</p>
        <h1>Team access only.</h1>
        <p className="login-copy">Enter the shared password to view spending, receipts, and team settings.</p>

        {showSetup ? (
          <div className="login-alert setup" role="alert">
            Set <code>SITE_PASSWORD</code> in your environment variables, then redeploy the app.
          </div>
        ) : (
          <form className="login-form" action="/api/site-login" method="post">
            <input type="hidden" name="next" value={safeNext(params.next)} />
            <label htmlFor="site-password">Password</label>
            <input id="site-password" name="password" type="password" autoComplete="current-password" autoFocus required placeholder="Enter team password" />
            {params.error === "1" && <p className="login-error" role="alert">That password is not correct. Try again.</p>}
            <button className="primary-button dark full" type="submit">Unlock Peptiking</button>
          </form>
        )}
        <p className="login-footnote">Protected access · Receipt proof stays private</p>
      </section>
    </main>
  );
}

'use client';

/**
 * A page that failed on the server, most often the signed-in home page when the account's card could not be read.
 * Nothing is shown in its place on purpose: an app opened on an empty card would save that empty card over the real one.
 */
export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="landing nf">
      <header className="lbar">
        <a className="wordmark" href="/"><span>CareerCards</span></a>
      </header>
      <main className="nf-main">
        <div className="nf-copy">
          <div className="eyebrow">Rain delay</div>
          <h1>Your cards didn&apos;t load.</h1>
          <p>We couldn&apos;t reach your account just now. Nothing was changed, and your cards are safe. Try again in a moment.</p>
          <div className="cta">
            <button type="button" className="btn primary" onClick={() => { reset(); window.location.reload(); }}>Try again</button>
            <a className="btn" href="/">Back to the front</a>
          </div>
        </div>
      </main>
    </div>
  );
}

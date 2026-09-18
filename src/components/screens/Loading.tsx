'use client';

/**
 * The loading screen.
 *
 * There is real work happening behind this — every background and cut-out has to
 * be decoded before the first frame, because the world is drawn synchronously and
 * a half-loaded world would be measured by the diff engine as if it were real. So
 * the bar is not a decoration on a timer; it tracks actual progress.
 */
export default function Loading({ progress }: { progress: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  return (
    <main className="relative h-full w-full overflow-hidden bg-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/art/bg-street.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-ink/55" />

      <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12">
        <h1 className="display text-[clamp(3rem,11vw,9rem)] text-text">Posted</h1>
        <p className="mt-2 text-[11px] tracking-[0.18em] text-text/80 sm:text-xs">
          IN LEONIDA WHATEVER YOU POST BECOMES TRUE.
        </p>
      </div>

      <div className="absolute bottom-6 right-8 text-[11px] tracking-[0.18em] text-mute sm:right-12">
        DEVELOPING{pct >= 100 ? '' : '…'}
      </div>

      <div className="absolute bottom-0 left-0 h-[3px] w-full bg-line/60">
        <div
          data-testid="load-bar"
          className="h-full bg-accent transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </main>
  );
}

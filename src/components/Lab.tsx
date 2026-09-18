'use client';

import { useCallback, useState } from 'react';
import { type DiffReport, detectFlags, diffImages } from '@/lib/diff';
import { CASES, buildMutation } from '@/lib/mutations';
import { INITIAL_STATE, compositeToDataUrl } from '@/lib/scene';

/**
 * Diff engine test bench.
 *
 * Runs every hand-made edit against the diff engine and prints the numbers it
 * measured. The important row is any case expecting no flags: an engine that
 * fires on everything is worthless.
 */

type Row = {
  id: string;
  what: string;
  expect: string[];
  got: string[];
  pass: boolean;
  ms: number;
  report: DiffReport;
  preview: string;
};

const fmt = (n: number, places = 3) => n.toFixed(places);

export default function Lab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    setRows([]);
    const src = compositeToDataUrl(INITIAL_STATE);
    setSource(src);
    const out: Row[] = [];
    for (const test of CASES) {
      const saved = await buildMutation(test.id, src);
      const started = performance.now();
      const report = await diffImages(src, saved);
      const got = detectFlags(report);
      const ms = performance.now() - started;
      const pass =
        got.length === test.expect.length &&
        test.expect.every((f) => got.includes(f as never));
      out.push({ ...test, got, pass, ms, report, preview: saved });
      setRows([...out]);
    }
    setRunning(false);
  }, []);

  const passed = rows.filter((r) => r.pass).length;

  return (
    <main className="min-h-full bg-[#0d0f13] p-5 text-[#e8e8e8]">
      <header className="mb-4 flex items-baseline gap-4">
        <h1 className="font-mono text-sm tracking-widest text-[#9aa0aa]">
          DIFF ENGINE — TEST BENCH
        </h1>
        <span
          data-testid="score"
          className={`font-mono text-sm ${
            passed === CASES.length ? 'text-[#6ee7a8]' : 'text-[#ffb86b]'
          }`}
        >
          {passed}/{CASES.length} pass
        </span>
        <button
          data-testid="run"
          onClick={() => void run()}
          disabled={running}
          className="rounded border border-[#3a4049] px-3 py-1 font-mono text-xs text-[#9aa0aa] hover:border-[#5a626d] disabled:opacity-40"
        >
          {running ? 'running…' : 'run all cases'}
        </button>
        {source && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={source} alt="source" className="ml-auto h-16 rounded border border-[#262a31]" />
        )}
      </header>

      <table className="w-full border-collapse font-mono text-xs">
        <thead className="text-[#6b7078]">
          <tr className="border-b border-[#262a31] text-left">
            <th className="py-2 pr-2">edit</th>
            <th className="py-2 pr-2">saved</th>
            <th className="py-2 pr-2">expected</th>
            <th className="py-2 pr-2">fired</th>
            <th className="py-2 pr-2">gain</th>
            <th className="py-2 pr-2">read?</th>
            <th className="py-2 pr-2">rot</th>
            <th className="py-2 pr-2">kx / offX</th>
            <th className="py-2 pr-2">fit</th>
            <th className="py-2 pr-2">bouncer miss/str/resid</th>
            <th className="py-2 pr-2">facade str</th>
            <th className="py-2 pr-2">sign str</th>
            <th className="py-2 pr-2">ms</th>
            <th className="py-2">ok</th>
          </tr>
        </thead>
        <tbody data-testid="results">
          {rows.map((r) => {
            const b = r.report.zones.bouncer;
            return (
              <tr key={r.id} className="border-b border-[#1b1e24] align-top">
                <td className="py-2 pr-2 text-[#c9d0d8]">{r.what}</td>
                <td className="py-2 pr-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.preview} alt={r.id} className="h-12 rounded border border-[#262a31]" />
                </td>
                <td className="py-2 pr-2 text-[#6b7078]">{r.expect.join(' + ') || '—'}</td>
                <td className="py-2 pr-2 text-[#c9d0d8]">{r.got.join(' + ') || '—'}</td>
                <td className="py-2 pr-2">{fmt(r.report.gain)}</td>
                <td className="py-2 pr-2">{r.report.unreadable ? 'dark' : 'ok'}</td>
                <td className="py-2 pr-2">{r.report.alignment.rotation}</td>
                <td className="py-2 pr-2">
                  {fmt(r.report.alignment.kx, 2)} / {fmt(r.report.alignment.offX, 1)}
                </td>
                <td className="py-2 pr-2">{fmt(r.report.alignment.score)}</td>
                <td className="py-2 pr-2">
                  {fmt(b.missing, 2)} / {fmt(b.structure)} / {fmt(b.residual)}
                </td>
                <td className="py-2 pr-2">{fmt(r.report.zones.facade.structure)}</td>
                <td className="py-2 pr-2">{fmt(r.report.zones.sign.structure)}</td>
                <td className="py-2 pr-2 text-[#6b7078]">{r.ms.toFixed(0)}</td>
                <td className={`py-2 ${r.pass ? 'text-[#6ee7a8]' : 'text-[#ff6b6b]'}`}>
                  {r.pass ? 'PASS' : 'FAIL'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}

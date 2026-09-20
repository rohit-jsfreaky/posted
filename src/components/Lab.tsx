'use client';

import { useCallback, useState } from 'react';
import { type DiffReport, diffImages } from '@/lib/diff';
import { readFlags, renderLevel, spotted } from '@/lib/level';
import { LEVELS } from '@/lib/levels';
import { CASES, buildMutation } from '@/lib/mutations';
import { assess } from '@/lib/suspicion';

/**
 * Diff engine test bench.
 *
 * Runs every hand-made edit against the engine and prints the numbers it measured.
 * The important rows are the ones expecting no flags: an engine that fires on
 * everything is worthless.
 */

type Row = {
  id: string;
  what: string;
  level: number;
  expect: string[];
  got: string[];
  pass: boolean;
  ms: number;
  suspicion: number;
  tells: string[];
  report: DiffReport;
  preview: string;
};

const fmt = (n: number, places = 3) => n.toFixed(places);

export default function Lab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setRows([]);
    const out: Row[] = [];
    for (const test of CASES) {
      // by id, not by position: the running order is the story's and level 6
      // plays fourth, so an index here silently ran every level-4 case against
      // the wrong scene
      const level = LEVELS.find((l) => l.id === test.level);
      if (!level) throw new Error(`no level with id ${test.level}`);
      const src = renderLevel(level, level.initial);
      const saved = await buildMutation(test.id, src, level);
      const started = performance.now();
      const report = await diffImages(src, saved, level.zones);
      const got = readFlags(level, report);
      const ms = performance.now() - started;
      const smell = assess(level, report);
      const hits = spotted(level, report, level.initial);
      const pass =
        got.length === test.expect.length && test.expect.every((f) => got.includes(f));
      out.push({
        ...test,
        got,
        pass,
        ms,
        suspicion: smell.total,
        tells: hits.map((t) => (t.fatal ? `${t.id}!` : t.id)),
        report,
        preview: saved,
      });
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
      </header>

      <table className="w-full border-collapse font-mono text-xs">
        <thead className="text-[#6b7078]">
          <tr className="border-b border-[#262a31] text-left">
            <th className="py-2 pr-2">lvl</th>
            <th className="py-2 pr-2">edit</th>
            <th className="py-2 pr-2">saved</th>
            <th className="py-2 pr-2">expected</th>
            <th className="py-2 pr-2">fired</th>
            <th className="py-2 pr-2">gain</th>
            <th className="py-2 pr-2">read?</th>
            <th className="py-2 pr-2">rot</th>
            <th className="py-2 pr-2">kx/off</th>
            <th className="py-2 pr-2">fit</th>
            <th className="py-2 pr-2">susp</th>
            <th className="py-2 pr-2">he spots</th>
            <th className="py-2 pr-2">ms</th>
            <th className="py-2">ok</th>
            <th className="py-2 pl-2">why not</th>
          </tr>
        </thead>
        <tbody data-testid="results">
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-[#1b1e24] align-top">
              <td className="py-2 pr-2 text-[#6b7078]">{r.level}</td>
              <td className="py-2 pr-2 text-[#c9d0d8]">{r.what}</td>
              <td className="py-2 pr-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.preview}
                  alt={r.id}
                  className="h-12 rounded border border-[#262a31]"
                />
              </td>
              <td className="py-2 pr-2 text-[#6b7078]">{r.expect.join(' + ') || '—'}</td>
              <td className="py-2 pr-2 text-[#c9d0d8]">{r.got.join(' + ') || '—'}</td>
              <td className="py-2 pr-2">{fmt(r.report.gain)}</td>
              <td className="py-2 pr-2">{r.report.unreadable ? 'dark' : 'ok'}</td>
              <td className="py-2 pr-2">{r.report.alignment.rotation}</td>
              <td className="py-2 pr-2">
                {fmt(r.report.alignment.kx, 2)}/{fmt(r.report.alignment.offX, 0)}
              </td>
              <td className="py-2 pr-2">{fmt(r.report.alignment.score)}</td>
              <td className="py-2 pr-2">{r.suspicion}</td>
              <td className="py-2 pr-2 text-[#ff9a9a]">{r.tells.join(', ') || '—'}</td>
              <td className="py-2 pr-2 text-[#6b7078]">{r.ms.toFixed(0)}</td>
              <td className={`py-2 ${r.pass ? 'text-[#6ee7a8]' : 'text-[#ff6b6b]'}`}>
                {r.pass ? 'PASS' : 'FAIL'}
              </td>
              <td className="py-2 pl-2 text-[10px] text-[#8d939c]">
                {r.pass
                  ? ''
                  : Object.entries(r.report.zones)
                      .map(
                        ([n, z]) =>
                          `${n}: miss ${z.missing.toFixed(2)} str ${z.structure.toFixed(2)} res ${z.residual.toFixed(3)} det ${z.detail.toFixed(2)} col ${z.colour.toFixed(2)} bright ${z.bright.toFixed(2)}`,
                      )
                      .join('  ·  ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

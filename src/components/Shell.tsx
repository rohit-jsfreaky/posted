'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Loading from './screens/Loading';
import Start from './screens/Start';
import Jobs from './screens/Jobs';
import Game from './Game';
import Ending from './screens/Ending';
import { preloadAssets } from '@/lib/assets';
import { MAIN, SIDE } from '@/lib/levels';
import { CHAPTERS, SIDE_BRIEFS } from '@/lib/story';
import { clearProgress, EMPTY, loadProgress, saveProgress, type Progress } from '@/lib/save';
import { clearIdentity } from '@/lib/identity';
import { budgetFor, type Standing } from '@/lib/heat';

/**
 * Which screen is on.
 *
 * The art has to be decoded before anything is drawn — the world is composited
 * synchronously and the diff engine would happily measure a half-loaded frame —
 * so loading is a real screen with a real bar, not a spinner over the game.
 */
type Screen = 'loading' | 'start' | 'jobs' | 'playing' | 'ending';

/**
 * Which job is open.
 *
 * A story job is identified by its place in the run, because that is what gates
 * it. A side job is identified by its level id, because there is no order to
 * them and there is not meant to be.
 */
type Open = { kind: 'main'; at: number } | { kind: 'side'; id: number };

export default function Shell() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<Progress>(EMPTY);
  const [open, setOpen] = useState<Open>({ kind: 'main', at: 0 });
  const held = useRef(false);

  // only timers are scheduled here; nothing is set during the effect itself
  useEffect(() => {
    let alive = true;
    void preloadAssets((p) => {
      if (alive) setLoaded(p);
    }).then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // hold the loading screen a beat after it fills, so it reads as a title card
  useEffect(() => {
    if (!ready || held.current) return;
    held.current = true;
    const t = window.setTimeout(() => {
      setProgress(loadProgress(MAIN.length));
      setScreen('start');
    }, 700);
    return () => window.clearTimeout(t);
  }, [ready]);

  const finish = useCallback(
    (what: Open, cost: number) => {
      setProgress((p) => {
        const banked: Progress =
          what.kind === 'main'
            ? { ...p, main: Math.max(p.main, what.at + 1) }
            : { ...p, side: Array.from(new Set([...p.side, what.id])) };
        // what the job cost him goes on the file, and stays there
        const next: Progress = { ...banked, heat: p.heat + cost };
        saveProgress(next);
        return next;
      });
      // only the run has an ending; a side job hands you back to the board
      if (what.kind === 'main' && what.at + 1 >= MAIN.length) setScreen('ending');
      else setScreen('jobs');
    },
    [],
  );

  const wipe = useCallback(() => {
    clearProgress();
    // the file the city opened goes with the progress it was built from
    clearIdentity();
    setProgress(EMPTY);
    setOpen({ kind: 'main', at: 0 });
  }, []);

  const counts: Standing = {
    main: progress.main,
    side: progress.side.length,
    sideTotal: SIDE.length,
    heat: progress.heat,
    budget: budgetFor(progress),
  };

  /**
   * Progress with the open job counted as done.
   *
   * The card only ever appears on the job-done screen, and the run is not banked
   * until the player leaves that screen — so handing it the stored figure showed
   * a file that had not noticed the job they had just finished.
   */
  const banked = (() => {
    if (open.kind === 'main') {
      return { ...counts, main: Math.max(counts.main, open.at + 1) };
    }
    const side = new Set(progress.side);
    side.add(open.id);
    return { ...counts, side: side.size };
  })();

  if (screen === 'loading') return <Loading progress={loaded} />;

  if (screen === 'start') {
    return (
      <Start
        done={progress.main}
        total={MAIN.length}
        onStart={() => {
          setOpen({ kind: 'main', at: Math.min(progress.main, MAIN.length - 1) });
          setScreen('playing');
        }}
        onJobs={() => setScreen('jobs')}
        onReset={wipe}
      />
    );
  }

  if (screen === 'jobs') {
    return (
      <Jobs
        progress={progress}
        onBack={() => setScreen('start')}
        onPick={(what) => {
          setOpen(what);
          setScreen('playing');
        }}
      />
    );
  }

  if (screen === 'ending') {
    return (
      <Ending
        progress={counts}
        onRestart={() => {
          wipe();
          setScreen('start');
        }}
      />
    );
  }

  const level =
    open.kind === 'main' ? MAIN[open.at] : (SIDE.find((l) => l.id === open.id) ?? SIDE[0]);
  const chapter = open.kind === 'main' ? CHAPTERS[open.at] : SIDE_BRIEFS[level.id];

  return (
    <Game
      key={open.kind === 'main' ? `m${open.at}` : `s${open.id}`}
      level={level}
      chapter={chapter}
      label={open.kind === 'main' ? `Job ${String(open.at + 1).padStart(2, '0')}` : 'Side job'}
      progress={banked}
      isLastMain={open.kind === 'main' && open.at + 1 >= MAIN.length}
      onQuit={() => setScreen('jobs')}
      onSolved={(cost) => finish(open, cost)}
    />
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Loading from './screens/Loading';
import Start from './screens/Start';
import Jobs from './screens/Jobs';
import Game from './Game';
import Ending from './screens/Ending';
import { preloadAssets } from '@/lib/assets';
import { LEVELS } from '@/lib/levels';
import { clearSave, loadDone, saveDone } from '@/lib/save';
import { clearIdentity } from '@/lib/identity';

/**
 * Which screen is on.
 *
 * The art has to be decoded before anything is drawn — the world is composited
 * synchronously and the diff engine would happily measure a half-loaded frame —
 * so loading is a real screen with a real bar, not a spinner over the game.
 */
type Screen = 'loading' | 'start' | 'jobs' | 'playing' | 'ending';

export default function Shell() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(0);
  const [at, setAt] = useState(0);
  const held = useRef(false);

  // only timers are scheduled here; nothing is set during the effect itself
  useEffect(() => {
    let alive = true;
    void preloadAssets((p) => {
      if (alive) setProgress(p);
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
      setDone(loadDone(LEVELS.length));
      setScreen('start');
    }, 700);
    return () => window.clearTimeout(t);
  }, [ready]);

  const finishJob = useCallback((index: number) => {
    setDone((d) => {
      const next = Math.max(d, index + 1);
      saveDone(next);
      return next;
    });
    if (index + 1 >= LEVELS.length) setScreen('ending');
    else setScreen('jobs');
  }, []);

  const wipe = useCallback(() => {
    clearSave();
    // the file the city opened goes with the progress it was built from
    clearIdentity();
    setDone(0);
    setAt(0);
  }, []);

  if (screen === 'loading') return <Loading progress={progress} />;

  if (screen === 'start') {
    return (
      <Start
        done={done}
        total={LEVELS.length}
        onStart={() => {
          setAt(Math.min(done, LEVELS.length - 1));
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
        done={done}
        onBack={() => setScreen('start')}
        onPick={(i) => {
          setAt(i);
          setScreen('playing');
        }}
      />
    );
  }

  if (screen === 'ending') {
    return (
      <Ending
        onRestart={() => {
          wipe();
          setScreen('start');
        }}
      />
    );
  }

  return (
    <Game
      key={at}
      index={at}
      onQuit={() => setScreen('jobs')}
      onSolved={() => finishJob(at)}
    />
  );
}

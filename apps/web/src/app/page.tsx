'use client';

import { isoDate } from '@lemonhead/schemas';
import type { FamilyProfile, FeeSchedule } from '@lemonhead/schemas';
import { useState, useSyncExternalStore } from 'react';

import { ComparisonView } from '../components/comparison-view.tsx';
import { FamilyForm } from '../components/family-form.tsx';
import { NurseryForm } from '../components/nursery-form.tsx';
import { NurserySwitcher } from '../components/nursery-switcher.tsx';
import { ProjectionView } from '../components/projection-view.tsx';
import {
  deleteNursery,
  getActiveNurseryName,
  listNurseries,
  loadFamily,
  saveFamily,
  saveNursery,
  setActiveNursery,
} from '../lib/storage.ts';
import type { StoredFamily } from '../lib/storage.ts';

type Step = 'nursery' | 'family' | 'projection';

const emptySubscribe = () => () => {};

export default function Home() {
  // Hydration-safe: false on the server and the hydration render, true after.
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>('nursery');
  const [nurseries, setNurseries] = useState<FeeSchedule[]>([]);
  const [activeName, setActiveName] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [storedFamily, setStoredFamily] = useState<StoredFamily | null>(null);
  const [profile, setProfile] = useState<FamilyProfile | null>(null);
  const [asOfDate] = useState(() => isoDate(new Date().toISOString().slice(0, 10)));

  // Render-phase adjustment (the React-sanctioned alternative to
  // set-state-in-effect): load persisted state once, after hydration.
  if (hydrated && !ready) {
    setReady(true);
    const list = listNurseries();
    setNurseries(list);
    const storedActive = getActiveNurseryName();
    setActiveName(
      list.some((entry) => entry.nursery.name === storedActive)
        ? storedActive
        : (list[0]?.nursery.name ?? null),
    );
    setStoredFamily(loadFamily());
  }

  if (!ready) return null;

  const active = nurseries.find((entry) => entry.nursery.name === activeName) ?? null;
  const refresh = () => {
    setNurseries(listNurseries());
    setActiveName(getActiveNurseryName());
  };

  return (
    <>
      {nurseries.length > 0 && (
        <NurserySwitcher
          nurseries={nurseries}
          activeName={activeName}
          onSelect={(name) => {
            setActiveNursery(name);
            refresh();
            setAdding(false);
            if (profile) setStep('projection');
          }}
          onAdd={() => {
            setAdding(true);
            setStep('nursery');
          }}
          onEdit={() => {
            setAdding(false);
            setStep('nursery');
          }}
          onDelete={(name) => {
            deleteNursery(name);
            const remaining = listNurseries();
            setNurseries(remaining);
            setActiveName(getActiveNurseryName());
            if (remaining.length === 0) {
              setAdding(true);
              setStep('nursery');
            }
          }}
        />
      )}
      {step !== 'nursery' && (
        <p>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setStep(step === 'projection' ? 'family' : 'nursery');
            }}
          >
            Back
          </button>
        </p>
      )}
      {step === 'nursery' && (
        <NurseryForm
          key={adding ? 'new-nursery' : (activeName ?? 'new-nursery')}
          initial={adding ? null : active}
          onSave={(saved) => {
            saveNursery(saved, adding ? undefined : (activeName ?? undefined));
            refresh();
            setAdding(false);
            setStep(profile ? 'projection' : 'family');
          }}
        />
      )}
      {step === 'family' && (
        <FamilyForm
          stored={storedFamily}
          onSave={(saved) => {
            setProfile(saved);
            saveFamily(saved);
            setStoredFamily(loadFamily());
            setStep('projection');
          }}
        />
      )}
      {step === 'projection' && active && profile && (
        <>
          <ProjectionView schedule={active} profile={profile} asOfDate={asOfDate} />
          {nurseries.length >= 2 && (
            <ComparisonView schedules={nurseries} profile={profile} asOfDate={asOfDate} />
          )}
        </>
      )}
      {step === 'projection' && (!active || !profile) && (
        <p className="note">Enter a nursery and your family details first.</p>
      )}
    </>
  );
}

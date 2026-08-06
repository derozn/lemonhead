'use client';

import { isoDate } from '@lemonhead/schemas';
import type { FamilyProfile, FeeSchedule } from '@lemonhead/schemas';
import { useState, useSyncExternalStore } from 'react';

import { FamilyForm } from '../components/family-form.tsx';
import { NurseryForm } from '../components/nursery-form.tsx';
import { ProjectionView } from '../components/projection-view.tsx';
import { loadFamily, loadNursery, saveFamily, saveNursery } from '../lib/storage.ts';
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
  const [schedule, setSchedule] = useState<FeeSchedule | null>(null);
  const [storedFamily, setStoredFamily] = useState<StoredFamily | null>(null);
  const [profile, setProfile] = useState<FamilyProfile | null>(null);
  const [asOfDate] = useState(() => isoDate(new Date().toISOString().slice(0, 10)));

  // Render-phase adjustment (the React-sanctioned alternative to
  // set-state-in-effect): load persisted state once, after hydration.
  if (hydrated && !ready) {
    setReady(true);
    setSchedule(loadNursery());
    setStoredFamily(loadFamily());
  }

  if (!ready) return null;

  return (
    <>
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
          initial={schedule}
          onSave={(saved) => {
            setSchedule(saved);
            saveNursery(saved);
            setStep('family');
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
      {step === 'projection' && schedule && profile && (
        <ProjectionView schedule={schedule} profile={profile} asOfDate={asOfDate} />
      )}
      {step === 'projection' && (!schedule || !profile) && (
        <p className="note">Enter a nursery and your family details first.</p>
      )}
    </>
  );
}

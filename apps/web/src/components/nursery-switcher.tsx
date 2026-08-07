'use client';

import type { FeeSchedule } from '@lemonhead/schemas';
import { useEffect, useRef, useState } from 'react';

/**
 * The saved-nurseries bar: pick the active nursery, add another, edit or
 * delete the active one. Deleting asks again inline (a second, explicit
 * button) instead of a blocking window.confirm.
 */
export function NurserySwitcher({
  nurseries,
  activeName,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
}: {
  nurseries: FeeSchedule[];
  activeName: string | null;
  onSelect: (name: string) => void;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: (name: string) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasConfirming = useRef(false);

  // Swapping "Delete" for the confirm pair unmounts the focused button,
  // which would drop keyboard and screen-reader focus to the body. Keep
  // focus on the flow instead: onto the confirm button on entering, back
  // onto the delete button on leaving (docs/standards.md, keyboard rule).
  useEffect(() => {
    if (confirmingDelete !== null) {
      wasConfirming.current = true;
      confirmButtonRef.current?.focus();
    } else if (wasConfirming.current) {
      wasConfirming.current = false;
      deleteButtonRef.current?.focus();
    }
  }, [confirmingDelete]);

  return (
    <nav aria-label="Saved nurseries" className="card">
      <h2>Your saved nurseries</h2>
      <ul className="switcher-list">
        {nurseries.map((entry) => {
          const name = entry.nursery.name;
          const isActive = name === activeName;
          return (
            <li key={name}>
              <button
                type="button"
                className={isActive ? undefined : 'ghost'}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => {
                  setConfirmingDelete(null);
                  onSelect(name);
                }}
              >
                {name}
              </button>
              {isActive && (
                <>
                  <button type="button" className="ghost" onClick={onEdit}>
                    Edit {name}
                  </button>
                  {confirmingDelete === name ? (
                    <>
                      <button
                        type="button"
                        className="danger"
                        ref={confirmButtonRef}
                        onClick={() => {
                          setConfirmingDelete(null);
                          onDelete(name);
                        }}
                      >
                        Yes, delete {name}
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          setConfirmingDelete(null);
                        }}
                      >
                        Keep it
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="ghost"
                      ref={deleteButtonRef}
                      onClick={() => {
                        setConfirmingDelete(name);
                      }}
                    >
                      Delete {name}
                    </button>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
      <button type="button" className="ghost" onClick={onAdd}>
        Add another nursery
      </button>
    </nav>
  );
}

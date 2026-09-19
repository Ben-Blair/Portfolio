/**
 * Whether Fun's video has painted a real frame this visit.
 *
 * ChatView holds the thinking dots until this is true (and at least two seconds have passed), so
 * the bubble never clears onto a white hole while the cut is still fetching. Module-level for the
 * same reason the Projects turn is: the video lives inside FunBlock, the wait lives in ChatView,
 * and neither can pass a prop through the panel table.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

let ready = false;

function emit() {
  for (const listener of listeners) listener();
}

export function funFrameReady() {
  return ready;
}

export function markFunFrame() {
  if (ready) return;
  ready = true;
  emit();
}

export function resetFunFrame() {
  if (!ready) return;
  ready = false;
  emit();
}

export function subscribeFunFrame(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

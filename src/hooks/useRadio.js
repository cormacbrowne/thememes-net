import { useSyncExternalStore } from 'react';
import { getRadioState, subscribeRadio } from '../utils/radioBus';

/** Subscribes a component to THE MEMES FM radio state without touching App state. */
export default function useRadio() {
  return useSyncExternalStore(subscribeRadio, getRadioState, getRadioState);
}

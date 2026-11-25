import { router } from 'expo-router';
import type { Step } from './eventForm';

// Wege im Studio an einer Stelle. Aufbau: docs/STUDIO-UMBAU-PLAN.md, Abschnitt 4.

/** Eventseite: alles zu einem Event. */
export const openEvent = (id: string) => router.push({ pathname: '/studio/event/[id]', params: { id } });
/** Event bearbeiten, auf Wunsch direkt bei einem Schritt (z. B. aus der Checkliste). */
export const editEvent = (id: string, step?: Step) => router.push({ pathname: '/studio/edit/[id]', params: step ? { id, step } : { id } });
/** Neues Event. `from` = ein früheres Event als Vorlage (duplizieren). */
export const newEvent = (from?: string) => router.push({ pathname: '/studio/edit/[id]', params: from ? { id: 'new', from } : { id: 'new' } });
export const goBack = () => router.canGoBack() ? router.back() : router.replace('/studio');

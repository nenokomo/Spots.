import { router } from 'expo-router';
import type { FormPart } from './eventForm';

// Wege im Studio an einer Stelle. Aufbau: docs/STUDIO-UMBAU-PLAN.md, Abschnitt 4.

/** Eventseite: alles zu einem Event. `part` öffnet dort gleich einen Teil zum Bearbeiten (z. B. aus „Noch offen“). */
export const openEvent = (id: string, part?: FormPart) => router.push({ pathname: '/studio/event/[id]', params: part ? { id, part } : { id } });
/** Neues Event: die leere Eventseite, von unten eingeblendet. `from` = ein früheres Event als Vorlage (duplizieren). */
export const newEvent = (from?: string) => router.push(from ? { pathname: '/studio/new', params: { from } } : '/studio/new');
export const goBack = () => router.canGoBack() ? router.back() : router.replace('/studio');

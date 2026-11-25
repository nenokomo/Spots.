import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { createAccountActions } from '../accounts/auth';
import { getAccountClient } from '../accounts/client';
import { setGuestMode } from '../accounts/guestMode';
import { useAccountSession } from '../accounts/useAccountSession';
import { Card, ConfirmSheet, Message, StudioButton, studioStyles } from './ui';

/** Konto des angemeldeten Veranstalters: abmelden und löschen (mit Rückfrage). `member` = Team-Mitglied ohne eigenes Profil. */
export function AccountCard({ member }: { member: boolean }) {
  const { session } = useAccountSession();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function act(task: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await task(); await setGuestMode(false); router.replace('/account'); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Hat nicht geklappt.'); setBusy(false); }
  }
  return <Card>
    <Text style={studioStyles.muted}>{session?.user.email}</Text>
    <StudioButton variant="secondary" label="Abmelden" disabled={busy} onPress={() => void act(() => createAccountActions(getAccountClient()).signOut())} />
    <StudioButton variant="ghost" label="Konto löschen" disabled={busy} onPress={() => { setError(null); setConfirm(true); }} />
    {!confirm && <Message error={error} />}
    <ConfirmSheet visible={confirm} title="Konto endgültig löschen?" danger confirmLabel="Konto löschen" busy={busy} error={error}
      text={member
        ? 'Das Profil des Veranstalters und seine Events bleiben bestehen. Das lässt sich nicht rückgängig machen.'
        : 'Euer Profil und eure Events werden ausgeblendet, nicht gelöscht. Ansprechperson und Telefon werden gelöscht. Das lässt sich nicht rückgängig machen.'}
      onConfirm={() => void act(() => createAccountActions(getAccountClient()).deleteAccount())} onClose={() => { if (!busy) setConfirm(false); }} />
  </Card>;
}

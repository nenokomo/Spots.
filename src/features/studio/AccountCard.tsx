import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { createAccountActions } from '../accounts/auth';
import { getAccountClient } from '../accounts/client';
import { setGuestMode } from '../accounts/guestMode';
import { useAccountSession } from '../accounts/useAccountSession';
import { Card, Message, StudioButton, studioStyles } from './ui';

/** Konto des angemeldeten Veranstalters: abmelden und (zweistufig) löschen. `member` = Team-Mitglied ohne eigenen Club. */
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
    <Text style={studioStyles.muted}>Angemeldet als {session?.user.email}</Text>
    <StudioButton variant="secondary" label="Abmelden" disabled={busy} onPress={() => void act(() => createAccountActions(getAccountClient()).signOut())} />
    {confirm ? <>
      <Text style={studioStyles.body}>{member
        ? 'Dein Konto wird endgültig gelöscht. Der Club und seine Events bleiben bestehen. Das lässt sich nicht rückgängig machen.'
        : 'Euer Konto wird endgültig gelöscht. Der Club und seine Events werden ausgeblendet, nicht gelöscht. Ansprechperson und Telefon werden gelöscht. Das lässt sich nicht rückgängig machen.'}</Text>
      <StudioButton variant="danger" label="Konto endgültig löschen" loading={busy} onPress={() => void act(() => createAccountActions(getAccountClient()).deleteAccount())} />
      <StudioButton variant="ghost" label="Abbrechen" disabled={busy} onPress={() => setConfirm(false)} />
    </> : <StudioButton variant="ghost" label="Konto löschen" disabled={busy} onPress={() => setConfirm(true)} />}
    <Message error={error} />
  </Card>;
}

import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  createInvite, fetchInvites, fetchMembers, formatInviteCode, redeemInvite, removeMember, revokeInvite,
  type MyOrganizer, type OrganizerInvite, type OrganizerMember,
} from '../organizer/organizerApi';
import { dayFormat } from './format';
import { shareInvite } from './share';
import { studio, studioType } from './theme';
import { Card, ConfirmSheet, Input, Message, Pill, StudioButton, studioStyles } from './ui';

/**
 * Team (SQL 35). Der Besitzer sieht die Mitglieder, lädt über das Teilen-Menü ein und entfernt Mitglieder (mit Rückfrage).
 * Die Einladung ist ein Code mit kurzer Anleitung; ein Link, der die App öffnet, braucht das App-Schema (Plan, Abschnitt 7).
 */
export function TeamCard({ organizer }: { organizer: MyOrganizer }) {
  const owner = organizer.role === 'owner';
  const [members, setMembers] = useState<OrganizerMember[] | null>(null);
  const [invites, setInvites] = useState<OrganizerInvite[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<OrganizerMember | null>(null);

  const load = useCallback(() => {
    if (!owner) return;
    Promise.all([fetchMembers(organizer.id), fetchInvites(organizer.id)])
      .then(([people, codes]) => { setMembers(people); setInvites(codes); })
      .catch((failure: unknown) => { setMembers([]); setError(failure instanceof Error ? failure.message : 'Laden hat nicht geklappt.'); });
  }, [owner, organizer.id]);
  useEffect(load, [load]);

  async function run(key: string, task: () => Promise<unknown>) {
    setBusy(key); setError(null);
    try { await task(); load(); return true; }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Hat nicht geklappt.'); return false; }
    finally { setBusy(null); }
  }

  /** Neuen Code erzeugen und gleich das Teilen-Menü öffnen. */
  async function invite() {
    let code: string | null = null;
    const done = await run('new', async () => { code = (await createInvite(organizer.id)).code; });
    if (done && code) await shareInvite(code, organizer.displayName);
  }

  if (!owner) return <Card><Text style={studioStyles.muted}>Ihr gehört zum Team. Mitglieder verwaltet der Besitzer des Profils.</Text></Card>;

  return <Card>
    {members === null && <Text style={studioStyles.muted}>Lädt …</Text>}
    {members?.map((member) => <View key={member.userId} style={styles.row}>
      <View style={styles.copy}>
        <Text style={studioStyles.body} numberOfLines={1}>{member.email}</Text>
        <Pill label={member.role === 'owner' ? 'Besitzer' : 'Mitglied'} tone={member.role === 'owner' ? 'accent' : 'muted'} />
      </View>
      {member.role === 'editor' && <StudioButton small variant="ghost" label="Entfernen" disabled={!!busy} onPress={() => setRemoving(member)} />}
    </View>)}

    {invites.map((item) => <View key={item.code} style={styles.invite}>
      <View style={styles.copy}>
        <Text selectable accessibilityLabel={`Einladungscode ${formatInviteCode(item.code)}`} style={styles.code}>{formatInviteCode(item.code)}</Text>
        <Text style={studioStyles.muted}>Offen bis {dayFormat.format(new Date(item.expiresAt))}</Text>
      </View>
      <StudioButton small variant="secondary" icon="share" label="Teilen" disabled={!!busy} onPress={() => void shareInvite(item.code, organizer.displayName)} />
      <StudioButton small variant="ghost" label="Löschen" loading={busy === item.code} disabled={!!busy} onPress={() => void run(item.code, () => revokeInvite(item.code))} />
    </View>)}
    <StudioButton variant="secondary" icon="users" label="Mitglied einladen" loading={busy === 'new'} disabled={!!busy} onPress={() => void invite()} />
    {!removing && <Message error={error} />}

    <ConfirmSheet visible={!!removing} title="Mitglied entfernen?" text={removing ? `${removing.email} kann eure Events und Bilder dann nicht mehr bearbeiten.` : undefined}
      confirmLabel="Entfernen" danger busy={!!removing && busy === removing.userId} error={error}
      onConfirm={() => { if (removing) void run(removing.userId, () => removeMember(organizer.id, removing.userId)).then((done) => { if (done) setRemoving(null); }); }}
      onClose={() => { setRemoving(null); setError(null); }} />
  </Card>;
}

/** Für Veranstalter-Konten ohne Profil: Einladungscode eines Teams einlösen. */
export function RedeemInviteCard({ onJoined }: { onJoined: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function redeem() {
    if (code.replace(/[^0-9a-f]/gi, '').length !== 12) { setError('Bitte den ganzen Code eingeben (12 Zeichen).'); return; }
    setBusy(true); setError(null);
    try { await redeemInvite(code); onJoined(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Einlösen hat nicht geklappt.'); setBusy(false); }
  }
  return <Card>
    <Text style={studioStyles.heading}>Ihr habt eine Einladung?</Text>
    <Input label="Einladungscode" value={code} onChange={setCode} placeholder="XXXX-XXXX-XXXX" maxLength={20} editable={!busy} autoComplete="off" error={error} />
    <StudioButton variant="secondary" label="Code einlösen" loading={busy} onPress={() => void redeem()} />
  </Card>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, gap: 6, minWidth: 0 },
  invite: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: studio.radiusSmall, borderWidth: 1, borderColor: studio.line, backgroundColor: studio.bg },
  code: { ...studioType.heading, fontSize: 16, color: studio.accent, letterSpacing: 1.2, fontVariant: ['tabular-nums'] },
});

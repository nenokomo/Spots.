import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  createInvite, fetchInvites, fetchMembers, formatInviteCode, redeemInvite, removeMember, revokeInvite,
  type MyOrganizer, type OrganizerInvite, type OrganizerMember,
} from '../organizer/organizerApi';
import { dayFormat } from './format';
import { studio, studioType } from './theme';
import { Card, Input, Message, Pill, StudioButton, studioStyles } from './ui';

/**
 * Team eines Clubs (SQL 35). Der Besitzer sieht die Mitglieder, erzeugt Einladungscodes und entfernt Mitglieder.
 * Mitglieder sehen nur einen Hinweis. Einfache Oberfläche – Design offen für Noyan.
 */
export function TeamCard({ organizer }: { organizer: MyOrganizer }) {
  const owner = organizer.role === 'owner';
  const [members, setMembers] = useState<OrganizerMember[] | null>(null);
  const [invites, setInvites] = useState<OrganizerInvite[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!owner) return;
    Promise.all([fetchMembers(organizer.id), fetchInvites(organizer.id)])
      .then(([people, codes]) => { setMembers(people); setInvites(codes); })
      .catch((failure: unknown) => { setMembers([]); setError(failure instanceof Error ? failure.message : 'Laden hat nicht geklappt.'); });
  }, [owner, organizer.id]);
  useEffect(load, [load]);

  async function run(key: string, task: () => Promise<unknown>) {
    setBusy(key); setError(null);
    try { await task(); load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Hat nicht geklappt.'); }
    finally { setBusy(null); }
  }

  if (!owner) return <Card><Text style={studioStyles.muted}>Du gehörst zum Team dieses Clubs. Mitglieder verwaltet der Besitzer des Clubs.</Text></Card>;

  return <Card>
    <Text style={studioStyles.muted}>Team-Mitglieder können Events, Storys und Bilder des Clubs bearbeiten. Antrag, Ansprechperson und Team bleiben beim Besitzer.</Text>
    {members === null && <Text style={studioStyles.muted}>Lädt …</Text>}
    {members?.map((member) => <View key={member.userId} style={styles.row}>
      <View style={styles.copy}>
        <Text style={studioStyles.body} numberOfLines={1}>{member.email}</Text>
        <Pill label={member.role === 'owner' ? 'Besitzer' : 'Mitglied'} tone={member.role === 'owner' ? 'accent' : 'muted'} />
      </View>
      {member.role === 'editor' && <StudioButton small variant="danger" label="Entfernen" loading={busy === member.userId} disabled={!!busy}
        onPress={() => void run(member.userId, () => removeMember(organizer.id, member.userId))} />}
    </View>)}

    {invites.map((invite) => <View key={invite.code} style={styles.invite}>
      <View style={styles.copy}>
        <Text selectable accessibilityLabel={`Einladungscode ${formatInviteCode(invite.code)}`} style={styles.code}>{formatInviteCode(invite.code)}</Text>
        <Text style={studioStyles.muted}>Gültig bis {dayFormat.format(new Date(invite.expiresAt))}, einmal nutzbar</Text>
      </View>
      <StudioButton small variant="ghost" label="Zurückziehen" loading={busy === invite.code} disabled={!!busy} onPress={() => void run(invite.code, () => revokeInvite(invite.code))} />
    </View>)}
    <StudioButton small variant="secondary" label="Einladungscode erstellen" loading={busy === 'new'} disabled={!!busy} onPress={() => void run('new', () => createInvite(organizer.id))} />
    <Text style={studioStyles.muted}>Gebt den Code nur an die Person weiter, die ihr einladen wollt. Sie registriert sich als Veranstalter mit „Ich habe einen Einladungscode“ und gibt ihn nach dem Anmelden ein.</Text>
    <Message error={error} />
  </Card>;
}

/** Für Veranstalter-Konten ohne Club: Einladungscode eines Clubs einlösen. */
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
    <Text style={studioStyles.heading}>Einladung von einem Club?</Text>
    <Text style={studioStyles.muted}>Wenn ihr zum Team eines Clubs gehört, der schon bei Spots ist, gebt hier den Einladungscode ein.</Text>
    <Input label="Einladungscode" value={code} onChange={setCode} placeholder="XXXX-XXXX-XXXX" maxLength={20} editable={!busy} autoComplete="off" />
    <Message error={error} />
    <StudioButton variant="secondary" label="Code einlösen" loading={busy} onPress={() => void redeem()} />
  </Card>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, gap: 6, minWidth: 0 },
  invite: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: studio.radiusSmall, borderWidth: 1, borderColor: studio.line, backgroundColor: studio.bg },
  code: { ...studioType.heading, color: studio.accent, letterSpacing: 1.5, fontVariant: ['tabular-nums'] },
});

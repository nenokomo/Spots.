import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { formatPrice } from '../../services/content';
import { addTicket, deleteTicket, fetchTickets, maxTickets, parsePrice, setTicketSoldOut, type StudioTicket } from '../organizer/organizerApi';
import { normalizeWebsite } from '../organizer/signup';
import { studio } from './theme';
import { Card, Input, Message, StudioButton, studioStyles } from './ui';

/**
 * Ticketarten eines Events (SQL 17), z. B. „Abendkasse 12 €“ oder „Early Bird 8 €“. Nur Information und Link:
 * Spots verkauft keine Tickets. Erscheinen auf der Eventseite, sobald das Event live ist.
 * Einfache Oberfläche – Design offen für Noyan.
 */
export function TicketsCard({ eventId }: { eventId: string }) {
  const [tickets, setTickets] = useState<StudioTicket[] | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchTickets(eventId).then(setTickets, (failure: unknown) => { setTickets([]); setError(failure instanceof Error ? failure.message : 'Laden hat nicht geklappt.'); });
  }, [eventId]);
  useEffect(load, [load]);

  async function run(key: string, task: () => Promise<void>) {
    setBusy(key); setError(null);
    try { await task(); load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Hat nicht geklappt.'); }
    finally { setBusy(null); }
  }
  function add() {
    const priceCents = parsePrice(price), externalUrl = normalizeWebsite(link);
    const problem = name.trim().length < 1 ? 'Bitte einen Namen für das Ticket eingeben.'
      : priceCents === 'invalid' ? 'Bitte den Preis als Zahl eingeben, z. B. 12 oder 12,50.'
      : externalUrl === 'invalid' ? 'Der Ticket-Link ist ungültig.' : null;
    if (problem || priceCents === 'invalid' || externalUrl === 'invalid') { setError(problem); return; }
    void run('new', async () => {
      await addTicket(eventId, { name, priceCents, externalUrl }, tickets?.length ?? 0);
      setName(''); setPrice(''); setLink('');
    });
  }
  const full = (tickets?.length ?? 0) >= maxTickets;

  return <Card>
    <Text style={studioStyles.heading}>Tickets</Text>
    <Text style={studioStyles.muted}>Zeigt Preise und Ticketarten auf der Eventseite. Der Verkauf läuft über euren Link oder an der Abendkasse, nicht über Spots.</Text>
    {tickets === null && <Text style={studioStyles.muted}>Lädt …</Text>}
    {tickets?.map((ticket) => <View key={ticket.id} style={styles.row}>
      <View style={styles.copy}>
        <Text style={studioStyles.body}>{ticket.name} · {formatPrice(ticket.priceCents, 'EUR')}</Text>
        {ticket.externalUrl && <Text numberOfLines={1} style={studioStyles.muted}>{ticket.externalUrl.replace(/^https:\/\/(www\.)?/, '')}</Text>}
        <View style={styles.soldOut}>
          <Switch accessibilityLabel={`${ticket.name} ausverkauft`} value={ticket.soldOut} disabled={!!busy}
            onValueChange={(value) => void run(ticket.id, () => setTicketSoldOut(ticket.id, value))}
            trackColor={{ true: studio.amber, false: studio.panelHigh }} />
          <Text style={studioStyles.muted}>Ausverkauft</Text>
        </View>
      </View>
      <StudioButton small variant="ghost" label="Löschen" disabled={!!busy} onPress={() => void run(ticket.id, () => deleteTicket(ticket.id))} />
    </View>)}
    {!full && <>
      <View style={studioStyles.row}>
        <View style={[studioStyles.flex, { flexGrow: 3 }]}><Input label="Ticket" value={name} onChange={setName} placeholder="z. B. Abendkasse" maxLength={80} editable={!busy} /></View>
        <View style={studioStyles.flex}><Input label="Preis in €" optional value={price} onChange={setPrice} placeholder="12,50" keyboard="numbers-and-punctuation" maxLength={9} editable={!busy} /></View>
      </View>
      <Input label="Link zum Ticket" optional value={link} onChange={setLink} placeholder="tickets.example.de/…" keyboard="url" maxLength={500} editable={!busy} />
      <StudioButton small variant="secondary" icon="ticket" label="Ticket hinzufügen" loading={busy === 'new'} disabled={!!busy} onPress={add} />
    </>}
    {full && <Text style={studioStyles.muted}>Höchstens {maxTickets} Ticketarten pro Event.</Text>}
    <Message error={error} />
  </Card>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  copy: { flex: 1, gap: 4, minWidth: 0 },
  soldOut: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

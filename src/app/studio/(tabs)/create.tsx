import { Redirect } from 'expo-router';

/** Platz für das „＋“ in der Reiterleiste. Der Knopf öffnet direkt „Neues Event“; diese Seite sieht man nur über die Adresse. */
export default function Create() {
  return <Redirect href={{ pathname: '/studio/edit/[id]', params: { id: 'new' } }} />;
}

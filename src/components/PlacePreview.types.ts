export type PlacePreviewProps = {
  coordinate: { latitude: number; longitude: number };
  /** Venue name, or the address when there is no venue. */
  title: string;
  /** Street and number, once the data provides it. */
  street?: string | null;
  /** Town or city. */
  detail?: string;
  /** Opens the route; missing for events that are over. */
  onRoute?: () => void;
};

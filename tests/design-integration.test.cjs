const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const jsx = require('react/jsx-runtime');

// Render component return trees with controlled hooks. No network, native runtime or invented app data.
const pushed = [];
function load(file, resource = {}) {
  const module = { exports: {} };
  const native = { StyleSheet: { create: s => s, flatten: s => s, absoluteFill: {} },
    useWindowDimensions: () => ({ width: 390 }),
    Image: 'Image', View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', Modal: 'Modal' };
  const stub = new Proxy({}, { get: (_, key) => key });
  function dependency(id) {
    if (id === 'react/jsx-runtime') return jsx;
    if (id === 'react') return { useState: initial => [initial, () => {}], useMemo: fn => fn(), useCallback: fn => fn, useEffect: () => {} };
    if (id === 'react-native') return native;
    if (id === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
    if (id === 'expo-router') return { Link: 'Link', router: { push: href => pushed.push(href) }, useLocalSearchParams: () => ({ id: 'source-uuid' }) };
    if (id.endsWith('/theme')) return { colors: stub, space: stub, radius: stub, type: stub, squircle: {}, gutter: 20 };
    if (id.endsWith('/utils/events')) return { eventDayLabel: () => 'Sa., 02.01.', eventTimeLabel: () => '21:00' };
    if (id.endsWith('/useEvents')) return { useEvent: () => resource };
    if (id.endsWith('/useNow')) return { useNow: () => Date.parse('2030-01-01T12:00:00Z') };
    if (id.endsWith('/types/events')) return { isLiveEvent: () => false };
    if (id.endsWith('/useOrganizer')) return { useOrganizerSummary: () => null };
    if (id.endsWith('/useEventContent')) return { useEventContent: () => ({ snaps: [], tickets: [] }) };
    if (id.endsWith('/utils/eventStatus')) return { eventPhase: () => 'upcoming' };
    if (id.endsWith('/navigation/eventRoutes')) return { organizerHref: id => ({ pathname: '/organizer/[id]', params: { id } }), eventDetailHref: id => ({ pathname: '/event/[id]', params: { id } }), eventHref: event => ({ pathname: '/event/[id]', params: { id: event.id } }) };
    return stub;
  }
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: dependency });
  return module.exports;
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
const event = { id: 'source-uuid', title: 'Controlled source record', categories: ['Clubs'],
  date: '02.01.2030', startsAt: '2030-01-02T20:00:00Z', location: 'Source city',
  image: { uri: 'https://example.org/source-image.jpg' }, imageIsPlaceholder: false,
  sourceName: 'Goabase', sourceUrl: 'https://www.goabase.net/12345', description: 'Source description' };

test('all event cards navigate to the event UUID they were given, without a fictional organizer association', () => {
  const href = { pathname: '/event/[id]', params: { id: event.id } };
  const cards = load('src/components/EventCards.tsx');
  const row = load('src/components/EventRow.tsx');
  for (const component of [cards.EventHero, row.EventRow]) {
    pushed.length = 0;
    const tree = component({ event, href, today: '2030-01-01', now: Date.parse('2030-01-01T12:00:00Z'), width: 320, distanceKm: 1 });
    const pressable = nodes(tree).find(node => node.type === 'PressableScale' && node.props.accessibilityRole === 'link');
    pressable.props.onPress();
    assert.deepEqual(pushed, [href]);
    assert(nodes(tree).some(node => node.props?.children === event.title));
  }
});
test('new detail layout displays the fetched record and real original/backlinks', () => {
  const Screen = load('src/screens/EventDetailScreen.tsx', { event, loading: false, error: null }).default;
  const elements = nodes(Screen());
  assert(elements.some(node => node.props?.children === event.title));
  assert(elements.some(node => node.props?.children === event.description));
  assert(elements.some(node => node.type === 'Link' && node.props.href === event.sourceUrl));
  assert(elements.some(node => node.type === 'Link' && node.props.href === 'https://www.goabase.net/'));
  assert(!elements.some(node => node.type === 'Link' && node.props.href?.pathname === '/organizer/[id]'));
});
test('new detail layout retains loading/error states without rendering a stale or fallback event', () => {
  for (const resource of [{ loading: true, error: null }, { event, loading: false, error: 'Source unavailable' }]) {
    const Screen = load('src/screens/EventDetailScreen.tsx', resource).default;
    const elements = nodes(Screen());
    assert(elements.some(node => node.type === 'EventDataState' && node.props.error === resource.error));
    assert(!elements.some(node => node.props?.children === event.title));
  }
});

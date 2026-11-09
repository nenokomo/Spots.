const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const jsx = require('react/jsx-runtime');

// Render component return trees with controlled hooks. No network, native runtime or invented app data.
function load(file, resource = {}) {
  const module = { exports: {} };
  const native = { StyleSheet: { create: s => s, flatten: s => s, absoluteFill: {} },
    useWindowDimensions: () => ({ width: 390 }),
    Image: 'Image', View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', Modal: 'Modal' };
  const stub = new Proxy({}, { get: (_, key) => key });
  function dependency(id) {
    if (id === 'react/jsx-runtime') return jsx;
    if (id === 'react') return { useState: initial => [initial, () => {}] };
    if (id === 'react-native') return native;
    if (id === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (id === 'expo-router') return { Link: 'Link', router: {}, useLocalSearchParams: () => ({ id: 'source-uuid' }) };
    if (id.endsWith('/theme')) return { colors: stub };
    if (id.endsWith('/useEvents')) return { useEvent: () => resource };
    if (id.endsWith('/useNow')) return { useNow: () => Date.parse('2030-01-01T12:00:00Z') };
    if (id.endsWith('/types/events')) return { isLiveEvent: () => false };
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

test('all four redesigned cards navigate using the event UUID, without a fictional organizer association', () => {
  for (const name of ['EventCard', 'ExploreEventCard', 'RadarEventCard', 'TodayEventCard']) {
    const component = load(`src/components/${name}.tsx`)[name];
    const tree = component({ event, distance: 1, height: 140 });
    const link = nodes(tree).find(node => node.type === 'Link');
    assert.equal(link.props.href.pathname, '/event/[id]');
    assert.equal(link.props.href.params.id, event.id);
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

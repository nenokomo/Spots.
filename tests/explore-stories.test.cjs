const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const jsx = require('react/jsx-runtime');

// Pure helpers are loaded as real TypeScript; components are rendered with
// controlled stand-ins. No network, native runtime or invented app data.
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(result.outputText, filename);
};
const { eventDayLabel, eventTimeLabel } = require('../src/utils/events.ts');
const { eventStoryMedia, remoteImageUri } = require('../src/utils/stories.ts');

function load(file) {
  const module = { exports: {} };
  const stub = new Proxy({}, { get: (_, key) => key });
  function dependency(id) {
    if (id === 'react/jsx-runtime') return jsx;
    if (id === 'react-native') return { StyleSheet: { create: s => s }, Image: 'Image', View: 'View', Text: 'Text', Pressable: 'Pressable' };
    if (id.endsWith('/utils/events')) return { eventDayLabel, eventTimeLabel };
    if (id.endsWith('/theme')) return { colors: stub };
    return stub;
  }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: {
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
const event = { id: 'source-uuid', title: 'Controlled source record', categories: [], genres: [],
  date: '14.11.2026', startsAt: '2026-11-14T22:00:00+01:00', location: 'Source city',
  image: { uri: 'https://example.org/source-image.jpg' }, imageIsPlaceholder: false };

test('story day labels use the Berlin calendar day, including after midnight', () => {
  assert.equal(eventDayLabel('2026-11-14T22:00:00+01:00', '2026-11-14'), 'Heute');
  assert.equal(eventDayLabel('2026-11-14T23:30:00Z', '2026-11-14'), 'Morgen');
  assert.equal(eventDayLabel('2026-11-15T21:00:00+01:00', '2026-11-14'), 'Morgen');
  assert.match(eventDayLabel('2026-11-21T22:00:00+01:00', '2026-11-14'), /^Sa\., 21\.11\.$/);
  assert.equal(eventTimeLabel('2026-11-14T21:00:00Z'), '22:00');
});

test('story media contains only the media of the event record and labels the symbol photo', () => {
  const media = eventStoryMedia(event);
  assert.equal(media.length, 1);
  assert.equal(media[0].kind, 'image');
  assert.equal(media[0].source, event.image);
  assert.equal(media[0].placeholder, false);
  assert.equal(eventStoryMedia({ ...event, image: 1, imageIsPlaceholder: true })[0].placeholder, true);
  assert.equal(remoteImageUri(event.image), event.image.uri);
  assert.equal(remoteImageUri(1), null);
});

test('story tile opens the story preview and keeps the save action for the same event', () => {
  let opened = 0;
  const { StoryTile } = load('src/components/StoryTile.tsx');
  const elements = nodes(StoryTile({ event, today: '2026-11-14', seen: false, onOpen: () => { opened++; } }));
  const tile = elements.find(node => node.type === 'Pressable');
  tile.props.onPress();
  assert.equal(opened, 1);
  assert(elements.some(node => node.props?.children === event.title));
  assert(elements.some(node => node.type === 'SaveEventButton' && node.props.id === event.id));
  // The tile itself never links to an organizer or a fictional target.
  assert(!elements.some(node => node.type === 'Link'));
});

test('explore keeps search, genre and date filters and routes stories to the event detail page', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/screens/ExploreScreen.tsx'), 'utf8');
  for (const required of ['<TextInput', '<CategoryFilters', '<EventCalendar', 'matchesEventPeriod', '<ExploreEventCard', '<StoryTile', '<EventStoryViewer']) {
    assert(source.includes(required), `${required} missing`);
  }
  assert(source.includes("router.push({ pathname: '/event/[id]', params: { id: event.id } })"));
  // 24-hour BeReels stay a separate feature and are not part of the previews.
  assert(!/BeReel/i.test(source));
  assert(!/BeReel/i.test(fs.readFileSync(path.join(__dirname, '..', 'src/components/EventStoryViewer.tsx'), 'utf8')));
});

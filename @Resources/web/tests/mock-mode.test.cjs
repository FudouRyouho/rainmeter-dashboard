const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const root = process.env.RAINMETER_PROJECT_ROOT || resolve(__dirname, '../../..');
const source = readFileSync(resolve(root, '@Resources/web/rainmeter-utils.js'), 'utf8');

function load(window = {}) {
  const timers = [], messages = [], attributes = {};
  const element = { textContent: 'mock value', setAttribute: (key, value) => { attributes[key] = value; } };
  const document = { querySelector: () => element };
  const context = vm.createContext({
    window, document,
    console: Object.fromEntries(['log', 'info', 'warn'].map(level => [level, (...args) => messages.push([level, ...args])])),
    setTimeout: (callback, delay) => timers.push({ callback, delay }),
  });
  vm.runInContext(source, context);
  return { window, timers, messages, element, attributes };
}

function drain(timers) {
  const delays = [];
  for (let count = 0; timers.length; count++) {
    assert.ok(count < 20, 'readiness must not retry indefinitely');
    const timer = timers.shift();
    delays.push(timer.delay);
    timer.callback();
  }
  return delays;
}

const native = { GetMeasure: () => ({ GetValue: () => 42, GetString: () => 'native value' }) };

test('index enables mocks before loading the simulator only outside WebView', () => {
  const html = readFileSync(resolve(root, 'COMBINADO/index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const mockIndex = scripts.findIndex(match => /features\/mock-data\.js/.test(match[1]));
  assert.ok(mockIndex > 0, 'the public HTML must load the simulator');
  const init = scripts.slice(0, mockIndex).find(match => /window\.mocks_disabled\s*=/.test(match[2]));
  assert.ok(init, 'mock selection must precede the simulator');
  for (const [window, expected] of [[{}, false], [{ chrome: {} }, false], [{ chrome: { webview: {} } }, true]]) {
    vm.runInNewContext(init[2], { window });
    assert.equal(window.mocks_disabled, expected);
  }
});

test('real render helpers leave simulated text, state and paths untouched', () => {
  let stateComputations = 0;
  const env = load({ mocks_disabled: false, AlertHelper: {
    computeState: () => { stateComputations++; return 'normal'; },
    assignState: (element, state) => element.setAttribute('data-alert', state),
  } });
  const utils = env.window.RainmeterUtils;
  utils.setField('cpu.usage', 0);
  utils.setState('cpu.usage', 0, 'cpu');
  utils.setPathD(env.element, 'M0 0');
  assert.equal(env.element.textContent, 'mock value');
  assert.deepEqual(env.attributes, {});
  assert.equal(stateComputations, 0);
});

for (const flag of [true, undefined]) {
  test(`native rendering remains enabled with mocks_disabled=${flag}`, () => {
    const env = load({ mocks_disabled: flag, AlertHelper: {
      computeState: () => 'normal',
      assignState: (element, state) => element.setAttribute('data-alert', state),
    } });
    const utils = env.window.RainmeterUtils;
    utils.setField('cpu.usage', 42);
    utils.setState('cpu.usage', 42, 'cpu');
    utils.setPathD(env.element, 'M0 42');
    assert.equal(env.element.textContent, '42');
    assert.deepEqual(env.attributes, { 'data-alert': 'normal', d: 'M0 42' });
  });
}

test('missing host waits ten times then calls back once with honest fallback diagnostics', () => {
  const env = load();
  let calls = 0;
  env.window.RainmeterUtils.whenReady(api => {
    calls++;
    assert.equal(api.GetMeasure('cpu').GetValue(), 0);
    assert.equal(api.GetMeasure('cpu').GetString(), '');
  });
  assert.equal(calls, 0);
  assert.deepEqual(drain(env.timers), [...Array(10).fill(200), 300]);
  assert.equal(calls, 1);
  assert.equal(env.messages.filter(([level]) => level === 'warn').length, 1);
  assert.match(env.messages[0][1], /No disponible: usando fallback/);
  assert.equal(env.messages.some(([level]) => level === 'info'), false);
});

test('native host preserves measure values and ready callback without fallback retries', () => {
  const env = load({ RainmeterAPI: native });
  let calls = 0;
  env.window.RainmeterUtils.whenReady(api => {
    calls++;
    assert.equal(api, native);
    const measure = env.window.RainmeterUtils.getMeasure(api, 'cpu');
    assert.equal(measure.getValue(), 42);
    assert.equal(measure.getString(), 'native value');
  });
  assert.deepEqual(drain(env.timers), [300]);
  assert.equal(calls, 1);
  assert.equal(env.messages.filter(([level]) => level === 'info').length, 1);
  assert.equal(env.messages.some(([level]) => level === 'warn'), false);
});

test('a native host appearing during readiness is used instead of the fallback', () => {
  const env = load();
  let received;
  env.window.RainmeterUtils.whenReady(api => { received = api; });
  const first = env.timers.shift();
  assert.equal(first.delay, 200);
  env.window.RainmeterAPI = native;
  first.callback();
  assert.deepEqual(drain(env.timers), [300]);
  assert.equal(received, native);
  assert.equal(env.messages.some(([level]) => level === 'warn'), false);
});

test('existing RM and synchronous WebView aliases still expose native measures', () => {
  for (const window of [{ RM: native }, ...['RM', 'RainmeterAPI', 'Rainmeter'].map(alias => ({
    chrome: { webview: { hostObjects: { sync: { [alias]: native } } } },
  }))]) {
    const { window: loaded } = load(window);
    const api = loaded.RainmeterUtils.getAPI();
    assert.equal(api, native);
    assert.equal(loaded.RainmeterUtils.getMeasure(api, 'cpu').getValue(), 42);
  }
});

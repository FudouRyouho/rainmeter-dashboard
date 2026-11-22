const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

const root = process.env.RAINMETER_PROJECT_ROOT || process.cwd();
const source = readFileSync(root + '/@Resources/web/rainmeter-utils.js', 'utf8');

function load(window, document) {
  vm.runInNewContext(source, {
    window, document,
    console: { log() {}, info() {}, warn() {} },
    setTimeout: callback => callback(),
  });
  return window.RainmeterUtils;
}

test('native aliases retain legacy number/string fallbacks and cache identity', () => {
  for (const type of ['RainmeterAPI', 'RM', 'sync.RM', 'sync.RainmeterAPI', 'sync.Rainmeter']) {
    let calls = 0;
    const api = {
      GetMeasure(name) {
        calls++;
        return name === 'DISK' ? null : { GetNumber: () => 73.5, StringValue: 'C:\\Data' };
      },
    };
    const window = type.startsWith('sync.')
      ? { chrome: { webview: { hostObjects: { sync: { [type.slice(5)]: api } } } } }
      : { [type]: api };
    const utils = load(window, {});
    assert.equal(utils.getAPI(), api);
    utils.whenReady(ready => assert.equal(ready, api));
    const measure = utils.getMeasure(api, 'DISK');
    assert.equal(measure.getValue(), 73.5);
    assert.equal(measure.getNumber(), 73.5);
    assert.equal(measure.getString(), 'C:\\Data');
    assert.equal(utils.getMeasure(api, 'DISK'), measure);
    assert.equal(calls, 2);
    assert.equal(utils.bytesToGB(1073741824), 1);
  }
});

test('native disk-scoped helpers survive missing targets and mock/native transitions', () => {
  const element = { textContent: 'initial', setAttribute(key, value) { this[key] = value; } };
  const document = { querySelector: () => null };
  const tile = {
    getAttribute: () => '1',
    querySelector: selector => selector === '[data-field="disk.usagePct"]' ? element : null,
  };
  const config = { limit: 80 };
  const window = {
    mocks_disabled: true,
    ALERT_INDEX: { disk: config },
    AlertHelper: {
      computeState(value, actualConfig) {
        assert.equal(actualConfig, config);
        return value >= 80 ? 'high' : 'normal';
      },
      assignState(target, state) { target.state = state; },
    },
  };
  const utils = load(window, document);
  for (const key of ['disk1.usagePct', 'disk-1-usagePct']) {
    utils.setField(key, 83, tile);
    utils.setState(key, 83, 'disk', tile);
    assert.equal(element.textContent, '83');
    assert.equal(element.state, 'high');
  }
  utils.setPathD(element, 'M0 83');
  assert.equal(element.d, 'M0 83');
  window.mocks_disabled = false;
  utils.setField('disk1.usagePct', 0, tile);
  utils.setState('disk1.usagePct', 0, 'disk', tile);
  utils.setPathD(element, 'M0 0');
  assert.equal(element.textContent, '83');
  assert.equal(element.state, 'high');
  assert.equal(element.d, 'M0 83');
  window.mocks_disabled = true;
  utils.setField('disk1.usagePct', 0, tile);
  utils.setState('disk1.usagePct', 0, 'disk', tile);
  assert.equal(element.textContent, '0');
  assert.equal(element.state, 'normal');
  utils.setField('missing', 1);
  utils.setState('missing', 1, 'disk');
  utils.setPathD(null, 'M0 0');
});

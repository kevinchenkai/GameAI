'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { parseArgs, checkProject, credentials, prepare, verifyCompiled, FILES, PAGE } = require('./index.cjs');

test('explicit modes and upload version required', () => {
  assert.equal(parseArgs([]).mode, 'check');
  assert.equal(parseArgs(['upload', '--version', '0.1.0', '--desc', 'flow test']).desc, 'flow test');
  assert.equal(parseArgs(['check', '--credentials']).credentials, true);
  for (const args of [['release'], ['upload'], ['upload', '--version', '../secret'], ['preview', '--typo'], ['check', '--desc']]) assert.throws(() => parseArgs(args));
});

test('prepared package contains exactly eight shell files and honors AppID override', () => {
  assert.throws(() => checkProject({ WX_MP_APPID: 'touristappid' }));
  const project = checkProject({ WX_MP_APPID: 'wx1234567890abcdef' });
  const dir = prepare(project);
  try {
    const walk = folder => fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(folder, entry.name)) : [path.relative(dir, path.join(folder, entry.name))]);
    assert.deepEqual(walk(dir).sort(), [...FILES].sort());
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'project.config.json'), 'utf8')).appid, project.appid);
    assert.equal(JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../mp/project.config.json'), 'utf8')).appid, 'wxc3765635c190d693');
  } finally { fs.rmSync(dir, { recursive: true }); }
});

test('missing / invalid keys fail locally before loading SDK or reaching network', () => {
  assert.throws(() => credentials({}));
  assert.throws(() => credentials({ WX_MP_PRIVATE_KEY_PATH: 'relative.key' }));
  const env = { ...process.env }; delete env.WX_MP_PRIVATE_KEY_PATH;
  for (const args of [['preview'], ['upload', '--version', '0.1.0']]) {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'index.cjs'), ...args], { env, encoding: 'utf8' });
    assert.equal(result.status, 1); assert.match(result.stderr, /WX_MP_PRIVATE_KEY_PATH/);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apec26-key-test-'));
  const file = path.join(dir, 'fixture.key');
  try {
    fs.writeFileSync(file, 'not a key', { mode: 0o600 });
    assert.throws(() => credentials({ WX_MP_PRIVATE_KEY_PATH: file }), /Invalid/);
    const key = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    fs.writeFileSync(file, key.export({ type: 'pkcs8', format: 'pem' }));
    assert.equal(credentials({ WX_MP_PRIVATE_KEY_PATH: file }), fs.realpathSync(file));
    if (process.platform !== 'win32') {
      fs.chmodSync(file, 0o644);
      assert.throws(() => credentials({ WX_MP_PRIVATE_KEY_PATH: file }), /chmod 600/);
    }
  } finally { fs.rmSync(dir, { recursive: true }); }
});

test('compiled entry must match the backend and include its template', () => {
  const files = Object.fromEntries(FILES.map(name => [name, '']));
  files['app.json'] = JSON.stringify({ pages: [PAGE] });
  files[PAGE + '.wxml'] = '<web-view />';
  verifyCompiled(files);
  assert.throws(() => verifyCompiled({ ...files, 'app.json': JSON.stringify({ pages: ['pages/index/index'] }) }), /registry/);
  const missing = { ...files }; delete missing[PAGE + '.wxml'];
  assert.throws(() => verifyCompiled(missing), /missing/);
  assert.throws(() => verifyCompiled({ ...files, 'private.key': 'fixture' }), /Unexpected/);
});

test('native page fixes destination, restores language, retries and shares safely', () => {
  let definition;
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../../mp/' + PAGE + '.js'), 'utf8'), { Page: value => { definition = value; } });
  const page = { ...definition, data: { ...definition.data }, setData(patch) { Object.assign(this.data, patch); } };
  page.onLoad({ lang: 'en', url: 'https://untrusted.example/' });
  assert.equal(page.data.src, 'https://g.ismayday.mobi/apec26/wechat-demo/?lang=en&mpbuild=0.1.2');
  page.onWebError({ detail: { url: page.data.src, errMsg: 'domain rejected' } });
  assert.equal(page.data.failed, true); assert.match(page.data.errorDetails, /domain rejected/);
  page.retry(); assert.equal(page.data.failed, false); assert.equal(page.data.retryCount, 1);
  assert.equal(page.data.errorDetails, ''); assert.match(page.data.src, /&retry=1$/);
  assert.equal(page.onShareAppMessage({ webViewUrl: 'https://g.ismayday.mobi/apec26/wechat-demo/?lang=zh' }).path, '/' + PAGE + '?lang=zh');
  assert.equal(page.onShareAppMessage({ webViewUrl: 'https://untrusted.example/?lang=zh' }).path, '/' + PAGE + '?lang=en');
  page.onLoad({ lang: '<script>' }); assert.equal(page.data.lang, 'zh');
  assert.equal(page.onShareAppMessage().path, '/' + PAGE + '?lang=zh');
});

test('web-view is not mounted until its HTTPS URL is ready', () => {
  const template = fs.readFileSync(path.resolve(__dirname, '../../mp/' + PAGE + '.wxml'), 'utf8');
  assert.match(template, /<web-view\s+wx:if="\{\{src && !failed\}\}"/);
});

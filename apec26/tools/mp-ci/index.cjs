#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const MP = path.join(ROOT, 'mp');
const OUTPUT = path.join(ROOT, 'output/wechat-ci');
const PAGE = 'pages/home/home';
const FILES = ['project.config.json', 'app.js', 'app.json', 'sitemap.json',
  ...['js', 'json', 'wxml', 'wxss'].map(ext => PAGE + '.' + ext)];
const DEMO_URL = 'https://g.ismayday.mobi/apec26/wechat-demo/';

function parseArgs(argv) {
  const [mode = 'check', ...args] = argv;
  if (!['check', 'prepare', 'preview', 'upload'].includes(mode)) throw new Error('Use: check | prepare | preview | upload --version 0.1.0 [--desc text]');
  const options = { mode, credentials: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--credentials' && mode === 'check') options.credentials = true;
    else if (['--version', '--desc'].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith('--')) {
      const name = args[i].slice(2); options[name] = args[++i];
    }
    else throw new Error('Unknown or incomplete option');
  }
  if (mode === 'upload' && !/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(options.version || '')) throw new Error('upload requires --version, e.g. 0.1.0');
  if (options.desc && options.desc.length > 200) throw new Error('Description is too long (max 200 characters)');
  return options;
}

function checkProject(env = process.env) {
  for (const name of FILES) {
    const file = path.join(MP, name);
    if (!fs.existsSync(file) || fs.lstatSync(file).isSymbolicLink() || !fs.statSync(file).isFile()) throw new Error('Missing or unsafe mini-program file: ' + name);
    if (name.endsWith('.json')) JSON.parse(fs.readFileSync(file, 'utf8'));
    if (name.endsWith('.js')) {
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      if (result.status !== 0) throw new Error('JS syntax check failed: ' + name);
    }
  }
  const config = JSON.parse(fs.readFileSync(path.join(MP, 'project.config.json'), 'utf8'));
  const appid = env.WX_MP_APPID || config.appid;
  if (!/^wx[a-f0-9]{16}$/.test(appid)) throw new Error('Configure a real WX_MP_APPID');
  if (config.compileType !== 'miniprogram' || config.miniprogramRoot !== './' || config.setting.urlCheck !== true) throw new Error('Unexpected mini-program root or domain-check setting');
  const app = JSON.parse(fs.readFileSync(path.join(MP, 'app.json'), 'utf8'));
  if (JSON.stringify(app.pages) !== JSON.stringify([PAGE])) throw new Error('Demo page must match the backend entry: ' + PAGE);
  if (!fs.readFileSync(path.join(MP, PAGE + '.js'), 'utf8').includes(DEMO_URL)) throw new Error('Unexpected H5 entry URL');
  if (!fs.existsSync(path.join(ROOT, 'public/wechat-demo/index.html'))) throw new Error('Missing demo H5');
  return { appid, config };
}

function credentials(env = process.env) {
  const file = env.WX_MP_PRIVATE_KEY_PATH;
  if (!file || !path.isAbsolute(file)) throw new Error('Set WX_MP_PRIVATE_KEY_PATH to the absolute path of the code-upload .key file (not AppSecret)');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error('Code-upload key file does not exist');
  const real = fs.realpathSync(file);
  const within = folder => { const rel = path.relative(folder, real); return !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel); };
  if (within(path.join(ROOT, 'public')) || within(MP)) throw new Error('Code-upload key cannot be stored in a website or mini-program package');
  if (within(path.dirname(ROOT))) {
    const tracked = spawnSync('git', ['ls-files', '--error-unmatch', real], { cwd: ROOT, stdio: 'ignore' });
    const ignored = spawnSync('git', ['check-ignore', real], { cwd: ROOT, stdio: 'ignore' });
    if (tracked.status === 0 || ignored.status !== 0) throw new Error('Key inside the repository must be untracked and Git-ignored; preferably store it outside the repository');
  }
  if (process.platform !== 'win32' && (fs.statSync(real).mode & 0o077)) throw new Error('Code-upload key must be private: chmod 600 on the key file');
  try { crypto.createPrivateKey(fs.readFileSync(real)); }
  catch { throw new Error('Invalid code-upload private key; AppSecret is not a replacement'); }
  return real;
}

function prepare(project) {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const dir = fs.mkdtempSync(path.join(OUTPUT, 'project-'));
  for (const name of FILES) {
    const dest = path.join(dir, name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(MP, name), dest);
  }
  fs.writeFileSync(path.join(dir, 'project.config.json'), JSON.stringify({ ...project.config, appid: project.appid }, null, 2) + '\n');
  return dir;
}

function verifyCompiled(files) {
  const names = Object.keys(files);
  for (const name of FILES) if (!names.includes(name)) throw new Error('Compiled package is missing: ' + name);
  if (names.some(name => !FILES.includes(name))) throw new Error('Unexpected file in compiled shell package');
  const app = JSON.parse(String(files['app.json']));
  if (JSON.stringify(app.pages) !== JSON.stringify([PAGE])) throw new Error('Compiled page registry does not match ' + PAGE);
  if (!String(files[PAGE + '.wxml']).includes('web-view')) throw new Error('Compiled entry is missing web-view');
  console.log('PASS: compiled package contains the registered entry and all eight shell files: ' + PAGE);
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const project = checkProject();
  const remote = options.mode === 'preview' || options.mode === 'upload';
  const key = remote || options.credentials ? credentials() : undefined;
  const robot = Number(process.env.WX_MP_ROBOT || '1');
  if (!Number.isInteger(robot) || robot < 1 || robot > 30) throw new Error('WX_MP_ROBOT must be an integer from 1 to 30');
  console.log('PASS: local mini-program files, AppID and fixed HTTPS entry');
  if (options.mode === 'check') {
    console.log(key ? 'PASS: key file format and permissions (remote permissions not checked)' : 'Code-upload key, IP whitelist and business domain have NOT been checked');
    return;
  }
  let ci;
  if (remote) {
    try { ci = require('miniprogram-ci'); }
    catch { throw new Error('Unable to load SDK; run npm ci in apec26/tools/mp-ci with a supported Node.js runtime'); }
  }
  const projectPath = prepare(project);
  console.log('Prepared isolated project: ' + projectPath);
  if (!remote) return;
  const sdkProject = new ci.Project({ appid: project.appid, type: 'miniProgram', projectPath, privateKeyPath: key, ignores: ['node_modules/**/*'] });
  const common = { project: sdkProject, robot, setting: { es6: true, minify: true }, desc: options.desc || 'APEC26 minimal web-view flow test',
    onProgressUpdate: () => {} };
  const compiledPath = path.join(OUTPUT, 'compiled-' + Date.now() + '.zip');
  verifyCompiled(await ci.getCompiledResult(common, compiledPath));
  console.log('Compiled package audit: ' + compiledPath);
  if (options.mode === 'preview') {
    const qrcodeOutputDest = path.join(OUTPUT, 'preview-' + Date.now() + '.png');
    await ci.preview({ ...common, pagePath: PAGE, qrcodeFormat: 'image', qrcodeOutputDest });
    console.log('Preview QR: ' + qrcodeOutputDest);
  } else {
    await ci.upload({ ...common, version: options.version });
    console.log('Uploaded development version ' + options.version + '; review and release are separate steps');
  }
}

// The SDK retains compiler workers; a completed one-shot CLI must close them.
if (require.main === module) main().then(() => process.exit(0)).catch(error => {
  // Do not dump SDK request objects or credentials into logs.
  const message = String(error.message || 'CI operation failed').replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, '[redacted key]');
  console.error(message); process.exit(1);
});
module.exports = { parseArgs, checkProject, credentials, prepare, verifyCompiled, FILES, PAGE, main };

// Run with playwright-cli run-code --filename web/tools/verifyExperience.playwright.js.
// Fixture states exist only in isolated browser contexts; no level/save files are edited.
async (page) => {
  const browser = page.context().browser();
  const report = { checks: [], errors: [], screenshots: [] };
  const root = 'output/playwright/upgrade-20261002';
  const context = await browser.newContext({ viewport: { width: 402, height: 773 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mobile = await context.newPage();
  mobile.on('pageerror', (error) => report.errors.push(String(error)));
  mobile.on('console', (message) => { if (message.type() === 'error') report.errors.push(message.text()); });
  await mobile.addInitScript(() => {
    window.__audioContextCount = 0;
    if (window.AudioContext) window.AudioContext = new Proxy(window.AudioContext, {
      construct(target, args) { window.__audioContextCount += 1; return Reflect.construct(target, args); },
    });
  });
  const check = (name, passed, details) => {
    report.checks.push({ name, passed, details });
    if (!passed) throw new Error(`${name}: ${JSON.stringify(details)}`);
  };
  const screenshot = async (name, target = mobile) => {
    const path = `${root}/${name}.png`;
    await target.screenshot({ path });
    report.screenshots.push(path);
  };
  const start = async (key, data = {}) => {
    await mobile.evaluate(({ key, data }) => {
      const game = window.__GAME__;
      for (const scene of game.scene.getScenes(true)) if (scene.scene.key !== 'BackgroundMusic') game.scene.stop(scene.scene.key);
      game.scene.start(key, data);
    }, { key, data });
    await mobile.waitForFunction((key) => window.__GAME__.scene.isActive(key), key);
    await mobile.waitForTimeout(100);
  };
  const idle = () => mobile.waitForFunction(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    return !scene.busy && !scene.inputQueue.processing;
  });
  try {
    await mobile.goto('http://127.0.0.1:5177/');
    await mobile.waitForFunction(() => window.__GAME__?.scene.isActive('Home'));
    await mobile.waitForTimeout(150);
    const dpr = await mobile.evaluate(() => document.querySelector('canvas').width / document.querySelector('canvas').clientWidth);
    check('canvas DPR=2', dpr === 2, dpr);
    await screenshot('mobile-home');
    await start('HowToPlay');
    for (let index = 0; index < 4; index += 1) {
      await mobile.evaluate((index) => {
        const scene = window.__GAME__.scene.getScene('HowToPlay');
        scene.pageIndex = index; scene.renderPage();
      }, index);
      await screenshot(`mobile-help-${index + 1}`);
    }
    // Existing ground truth is specifically 375×812, six columns, depth 12.
    await mobile.setViewportSize({ width: 375, height: 812 });
    await start('Game', { levelId: 20, resume: false });
    const ground = await mobile.evaluate(() => {
      const layout = window.__STACKPOP__.getLayout();
      return { tile: (layout.tileSize / 2).toFixed(2), row: (layout.rowStep / 2).toFixed(2) };
    });
    check('six-column layout unchanged', ground.tile === '52.17' && ground.row === '44.34', ground);
    await mobile.setViewportSize({ width: 402, height: 773 });
    await start('Game', { levelId: 4, resume: false });
    await screenshot('mobile-game-L4');
    await mobile.evaluate(() => window.__GAME__.scene.getScene('Game').openSettings());
    await mobile.waitForFunction(() => window.__GAME__.scene.isActive('Settings'));
    await screenshot('mobile-settings');
    await mobile.evaluate(() => {
      const scene = window.__GAME__.scene.getScene('Settings');
      scene.confirmingRestart = true; scene.renderSettings();
    });
    await screenshot('mobile-settings-restart-confirm');
    await mobile.evaluate(() => window.__GAME__.scene.getScene('Settings').closeSettings());
    await mobile.waitForFunction(() => window.__GAME__.scene.isActive('Game'));
    for (const delay of [30, 260, 500]) {
      await mobile.evaluate(() => window.__STACKPOP__.restart());
      await idle();
      await mobile.evaluate(() => window.__STACKPOP__.pick(0));
      await mobile.waitForTimeout(delay);
      await mobile.evaluate(() => window.__STACKPOP__.restart());
      await idle();
      await mobile.waitForTimeout(750);
      const state = await mobile.evaluate(() => window.__STACKPOP__.getState());
      check(`restart cancels old pick at ${delay}ms`, state.moveCount === 0 && state.tray.length === 0, { moves: state.moveCount, tray: state.tray.length });
    }
    const shuffled = await mobile.evaluate(async () => {
      const promise = window.__STACKPOP__.shuffle();
      window.__STACKPOP__.restart();
      const result = await promise;
      return { result, shuffleUsed: window.__STACKPOP__.getState().shuffleUsed };
    });
    await idle();
    check('restart aborts worker and does not spend shuffle', !shuffled.result && shuffled.shuffleUsed === 0, shuffled);
    const queued = await mobile.evaluate(() => [0, 1, 2, 3].map((column) => window.__STACKPOP__.pick(column)));
    check('input queue accepts active+2 and refuses fourth', JSON.stringify(queued) === '[true,true,true,false]', queued);
    await idle();
    check('queue remains usable after cancellations', await mobile.evaluate(() => window.__STACKPOP__.getState().moveCount === 3));

    // Actual matching rules are exercised on a tiny transient three-card board.
    await mobile.evaluate(() => {
      const scene = window.__GAME__.scene.getScene('Game');
      const state = scene.model.state;
      const tiles = [0, 1, 2].map((i) => ({ id: `probe-${i}`, type: 'paw' }));
      scene.model.replaceState({ ...state, columns: [[tiles[2]], [], [], [], [], []], tray: tiles.slice(0, 2), status: 'playing', moveCount: 2 });
      scene.renderGame(); window.__STACKPOP__.pick(0);
    });
    await mobile.waitForFunction(() => window.__STACKPOP__.getState().status === 'won');
    const beforeArrival = await mobile.evaluate(() => window.__GAME__.scene.getScene('Game').trayTileImages.size);
    check('third tile not duplicated before flight arrives', beforeArrival === 2, beforeArrival);
    await screenshot('mobile-match-in-flight');
    await mobile.waitForFunction(() => window.__GAME__.scene.getScene('Game').trayTileImages.size === 3);
    await screenshot('mobile-match-arrival');
    await idle();
    await mobile.waitForTimeout(1000);
    const winSize = await mobile.evaluate(() => {
      const scene = window.__GAME__.scene.getScene('Game');
      return scene.children.list.filter((child) => child.texture?.key === 'ui-panel-win' || child.texture?.key === 'fx-star')
        .map((image) => ({ key: image.texture.key, width: image.displayWidth / 2, height: image.displayHeight / 2 }));
    });
    check('win animation preserves physical display dimensions', winSize.length === 4 && winSize[0].width < 380 && winSize.slice(1).every((star) => star.width === 38), winSize);
    await screenshot('mobile-win');
    await mobile.evaluate(() => {
      const scene = window.__GAME__.scene.getScene('Game');
      scene.pendingWinCelebration = true; scene.renderGame();
    });
    // Allow Phaser's next input-preupdate to register the newly drawn skip layer.
    await mobile.waitForTimeout(60);
    await mobile.mouse.click(12, 100);
    await mobile.waitForTimeout(80);
    const skipped = await mobile.evaluate(() => window.__GAME__.scene.getScene('Game').children.list.filter((child) => child.texture?.key === 'fx-star').map((star) => star.displayWidth / 2));
    check('skip restores exact star scales', skipped.length === 3 && skipped.every((width) => width === 38), skipped);

    for (const count of [5, 6, 7]) {
      await mobile.evaluate((count) => {
        const scene = window.__GAME__.scene.getScene('Game');
        const types = ['paw', 'paw', 'grass', 'grass', 'bell', 'bell', 'watering'];
        const tray = types.slice(0, count).map((type, i) => ({ id: `tray-${i}`, type }));
        scene.model.replaceState({ ...scene.model.state, tray, status: count === 7 ? 'failed' : 'playing' });
        scene.renderGame();
      }, count);
      if (count === 6) {
        await mobile.waitForTimeout(650);
        const scale = await mobile.evaluate(() => window.__GAME__.scene.getScene('Game').trayRoot.scaleX);
        check('danger tray never scales the whole region', scale === 1, scale);
      }
      await screenshot(count === 7 ? 'mobile-fail' : `mobile-tray-${count}`);
    }
    await mobile.evaluate(() => window.__STACKPOP__.restart());
    await mobile.evaluate(() => window.__GAME__.scene.getScene('Game').requestRestart());
    check('restart confirmation blocks board input', !await mobile.evaluate(() => window.__STACKPOP__.pick(0)));
    await screenshot('mobile-restart-confirm');
    await mobile.emulateMedia({ reducedMotion: 'reduce' });
    await mobile.evaluate(() => window.__STACKPOP__.restart());
    const reducedStart = Date.now();
    await mobile.evaluate(() => window.__STACKPOP__.pick(0));
    await idle();
    check('reduced-motion pick completes without long fly animation', Date.now() - reducedStart < 400, Date.now() - reducedStart);
    await mobile.evaluate(() => {
      const scene = window.__GAME__.scene.getScene('Game');
      const state = scene.model.state;
      scene.model.replaceState({ ...state, tray: ['paw','paw','grass','grass','bell','bell'].map((type, i) => ({ id: `reduce-${i}`, type })) });
      scene.renderGame();
    });
    check('reduced-motion disables warning pulse', await mobile.evaluate(() => window.__GAME__.scene.getScene('Game').trayWarningTween === null));
    const audioContexts = await mobile.evaluate(() => window.__audioContextCount);
    check('one shared AudioContext across scenes', audioContexts === 1, audioContexts);
    await start('Game', { levelId: 1, resume: false });
    const solution = await mobile.evaluate(async () => (await import('/src/game/levelRegistry.ts')).LEVEL_LOADER.get(1).solution);
    for (const step of solution) {
      await mobile.evaluate((column) => window.__STACKPOP__.pick(column), step.columnIndex);
      await idle();
    }
    const completed = await mobile.evaluate(() => window.__STACKPOP__.getState());
    check('real L1 solution plays through all 18 moves', completed.status === 'won' && completed.moveCount === 18 && completed.tray.length === 0,
      { status: completed.status, moves: completed.moveCount, tray: completed.tray.length });
    await screenshot('mobile-real-L1-win-reduced-motion');
    await start('Game', { levelId: 20, resume: false });
    const workerResult = await mobile.evaluate(async () => {
      const ok = await window.__STACKPOP__.shuffle();
      const { solve, solverStateFromGame } = await import('/src/game/core/Solver.ts');
      const state = window.__STACKPOP__.getState();
      return { ok, shuffleUsed: state.shuffleUsed, solvable: solve(solverStateFromGame(state), { maxNodes: 200000 }).solvable,
        strategy: window.__STACKPOP__.getDiagnostics().lastShuffleStrategy };
    });
    check('real worker shuffle yields solvable L20', workerResult.ok && workerResult.shuffleUsed === 1 && workerResult.solvable, workerResult);
    await start('LevelSelect');
    await screenshot('mobile-level-select');

    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const desktop = await desktopContext.newPage();
    desktop.on('pageerror', (error) => report.errors.push(String(error)));
    try {
      await desktop.goto('http://127.0.0.1:5177/?autostart=1&level=20');
      await desktop.waitForFunction(() => window.__STACKPOP__);
      await desktop.waitForTimeout(100);
      await screenshot('desktop-game-1280x720', desktop);
      await desktop.evaluate(() => window.__GAME__.scene.getScene('Game').scene.start('HowToPlay'));
      await desktop.waitForFunction(() => window.__GAME__.scene.isActive('HowToPlay'));
      await screenshot('desktop-help-1280x720', desktop);
    } finally { await desktopContext.close(); }
    check('browser has no page/console errors', report.errors.length === 0, report.errors);
    return report;
  } finally { await context.close(); }
}

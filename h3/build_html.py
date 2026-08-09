#!/usr/bin/env python3
"""把 cases.json 渲染成 index.html（单文件、无外部依赖、移动端友好）。"""
import html, json, pathlib

ROOT = pathlib.Path(__file__).parent
cases = json.loads((ROOT / "cases.json").read_text(encoding="utf-8"))

LEVEL_LABEL = {"ok": "复现成功", "warn": "部分成功"}

def esc(s):
    return html.escape(s, quote=True)

cards = []
for c in cases:
    prompt_html = esc(c["prompt"])
    vcls = " vertical" if c["vertical"] else ""
    cards.append(f"""
<article class="case" id="{esc(c['id'])}">
  <header class="case-head">
    <div class="case-title">
      <span class="cid">{esc(c['id'])}</span>
      <h3>{esc(c['title'])}</h3>
    </div>
    <span class="badge {esc(c['level'])}">{esc(c['verdict'])}</span>
  </header>

  <div class="meta">
    <span><b>模式</b>{esc(c['mode'])}</span>
    <span><b>分辨率</b>{esc(c['res'])}</span>
    <span><b>帧数</b>{c['frames']}</span>
    <span><b>时长</b>{esc(c['dur'])}</span>
  </div>

  <div class="player{vcls}">
    <video controls preload="none" playsinline
           poster="posters/{esc(c['id'])}.jpg"
           src="videos/{esc(c['id'])}.mp4"></video>
  </div>

  <p class="note">{esc(c['note'])}</p>

  <details class="prompt-box">
    <summary>
      <span>查看 Prompt 原文</span>
      <span class="pmeta">{c['chars']} 字符 · sha256 {esc(c['sha'])}</span>
    </summary>
    <div class="prompt-actions">
      <button class="copy" data-target="p-{esc(c['id'])}">复制</button>
    </div>
    <pre id="p-{esc(c['id'])}">{prompt_html}</pre>
  </details>
</article>""")

official = "".join(cards[:3])
community = "".join(cards[3:])

n_ok = sum(1 for c in cases if c["level"] == "ok")
n_warn = sum(1 for c in cases if c["level"] == "warn")

HTML = f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>MiniMax-H3 作品展示 · 开源复现</title>
<meta name="description" content="MiniMax-H3 开源版视频生成模型的复现作品集，包含 11 个案例的成片、完整 prompt 原文与逐条判定结论。">
<meta name="theme-color" content="#0b0d12">
<script>
/* 🔴 必须在 <style> 之前同步执行：先定主题再首次绘制，否则深色用户会闪一下白屏。
   默认 dark；只有用户显式切到 light 才走浅色。 */
(function () {{
  try {{
    var t = localStorage.getItem('h3-theme');
    if (t === 'light' || t === 'dark') {{
      document.documentElement.setAttribute('data-theme', t);
    }}
  }} catch (e) {{}}
}})();
</script>
<style>
  *,*::before,*::after{{box-sizing:border-box}}
  /* 🌙 默认深色。浅色只在用户**显式选择**时生效（html[data-theme="light"]），
     不跟随系统 —— 系统深浅色只用于决定"跟随系统"这一档的落点。 */
  :root{{
    --bg:#0b0d12; --bg2:#12151d; --card:#161a24; --line:#262c3a;
    --fg:#e8ecf4; --dim:#98a2b8; --accent:#6ea8ff; --accent2:#9b7bff;
    --ok:#3fb950; --warn:#d29922; --radius:14px;
    color-scheme:dark;
  }}
  html[data-theme="light"]{{
    --bg:#f6f7fb; --bg2:#ffffff; --card:#ffffff; --line:#e3e7ef;
    --fg:#1a1f2b; --dim:#5b6478; --accent:#2563eb; --accent2:#7c3aed;
    --ok:#1a7f37; --warn:#9a6700;
    color-scheme:light;
  }}

  /* 主题切换按钮 */
  .theme-toggle{{
    position:fixed; top:14px; right:14px; z-index:50;
    display:flex; align-items:center; gap:6px;
    background:color-mix(in srgb,var(--card) 88%,transparent);
    border:1px solid var(--line); border-radius:999px;
    padding:5px 6px; cursor:pointer;
    backdrop-filter:saturate(180%) blur(10px);
    -webkit-backdrop-filter:saturate(180%) blur(10px);
    font-family:inherit; font-size:.84rem; color:var(--dim);
    transition:border-color .18s, color .18s;
  }}
  .theme-toggle:hover{{border-color:var(--accent); color:var(--fg)}}
  .theme-toggle .ico{{
    width:24px; height:24px; display:grid; place-items:center;
    border-radius:999px; font-size:.95rem; line-height:1;
  }}
  .theme-toggle .ico.on{{background:color-mix(in srgb,var(--accent) 20%,transparent); color:var(--fg)}}
  .theme-toggle .lbl{{padding-right:8px}}
  @media (max-width:600px){{
    .theme-toggle{{top:10px; right:10px; padding:4px 5px}}
    .theme-toggle .lbl{{display:none}}
  }}
  html{{-webkit-text-size-adjust:100%}}
  body{{
    margin:0; background:var(--bg); color:var(--fg);
    font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB",
      "Microsoft YaHei","Source Han Sans SC","Noto Sans CJK SC",sans-serif;
    line-height:1.75; -webkit-font-smoothing:antialiased;
  }}
  .wrap{{max-width:1080px; margin:0 auto; padding:0 20px}}

  /* ---------- 头部 ---------- */
  .hero{{
    padding:72px 0 56px; text-align:center;
    background:
      radial-gradient(1000px 400px at 50% -120px, rgba(110,168,255,.20), transparent 70%),
      linear-gradient(180deg, var(--bg2), var(--bg));
    border-bottom:1px solid var(--line);
  }}
  .hero h1{{
    margin:0 0 14px; font-size:clamp(1.9rem,5.4vw,3.1rem); line-height:1.25;
    letter-spacing:-.02em;
    background:linear-gradient(100deg,var(--accent),var(--accent2));
    -webkit-background-clip:text; background-clip:text; color:transparent;
  }}
  .hero .sub{{margin:0 auto; max-width:44em; color:var(--dim); font-size:1.02rem}}
  .stats{{
    display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:26px;
  }}
  .stat{{
    background:var(--card); border:1px solid var(--line); border-radius:999px;
    padding:7px 16px; font-size:.88rem; color:var(--dim);
  }}
  .stat b{{color:var(--fg); font-weight:650}}

  /* ---------- 章节 ---------- */
  section{{padding:56px 0 8px}}
  h2{{
    margin:0 0 8px; font-size:clamp(1.35rem,3.2vw,1.75rem); letter-spacing:-.01em;
    display:flex; align-items:center; gap:11px;
  }}
  h2::before{{
    content:""; width:4px; height:1.05em; border-radius:3px;
    background:linear-gradient(180deg,var(--accent),var(--accent2));
  }}
  .lead{{color:var(--dim); margin:0 0 24px; max-width:52em}}

  .intro-grid{{
    display:grid; gap:14px; margin:22px 0 6px;
    grid-template-columns:repeat(auto-fit,minmax(230px,1fr));
  }}
  .tile{{
    background:var(--card); border:1px solid var(--line);
    border-radius:var(--radius); padding:16px 18px;
  }}
  .tile h4{{margin:0 0 6px; font-size:.97rem}}
  .tile p{{margin:0; color:var(--dim); font-size:.9rem; line-height:1.7}}
  .tile code{{
    background:var(--bg); border:1px solid var(--line); border-radius:5px;
    padding:1px 6px; font-size:.85em;
  }}

  /* ---------- 案例卡 ---------- */
  .case{{
    background:var(--card); border:1px solid var(--line);
    border-radius:var(--radius); padding:20px; margin-bottom:20px;
  }}
  .case-head{{
    display:flex; align-items:flex-start; justify-content:space-between;
    gap:12px; flex-wrap:wrap; margin-bottom:12px;
  }}
  .case-title{{display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; min-width:0}}
  .cid{{
    font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    font-size:.82rem; color:var(--accent);
    background:color-mix(in srgb,var(--accent) 12%,transparent);
    border:1px solid color-mix(in srgb,var(--accent) 30%,transparent);
    border-radius:6px; padding:2px 8px; white-space:nowrap;
  }}
  .case h3{{margin:0; font-size:1.14rem; letter-spacing:-.01em}}
  .badge{{
    font-size:.82rem; padding:3px 12px; border-radius:999px; white-space:nowrap;
    border:1px solid transparent; font-weight:600;
  }}
  .badge.ok{{
    color:var(--ok); background:color-mix(in srgb,var(--ok) 14%,transparent);
    border-color:color-mix(in srgb,var(--ok) 34%,transparent);
  }}
  .badge.warn{{
    color:var(--warn); background:color-mix(in srgb,var(--warn) 14%,transparent);
    border-color:color-mix(in srgb,var(--warn) 34%,transparent);
  }}

  .meta{{
    display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px;
    font-size:.84rem; color:var(--dim);
  }}
  .meta span{{
    background:var(--bg); border:1px solid var(--line);
    border-radius:7px; padding:3px 10px;
  }}
  .meta b{{color:var(--fg); font-weight:600; margin-right:6px}}

  .player{{
    background:#000; border-radius:10px; overflow:hidden;
    border:1px solid var(--line); line-height:0;
  }}
  .player video{{width:100%; height:auto; display:block; max-height:74vh}}
  /* 竖屏成片：限制宽度，避免在桌面端占满整屏 */
  .player.vertical{{max-width:392px; margin:0 auto}}

  .note{{margin:14px 0 0; color:var(--dim); font-size:.93rem}}

  /* ---------- Prompt ---------- */
  .prompt-box{{
    margin-top:14px; border:1px solid var(--line);
    border-radius:10px; background:var(--bg); overflow:hidden;
  }}
  .prompt-box summary{{
    cursor:pointer; padding:11px 14px; font-size:.9rem; user-select:none;
    display:flex; justify-content:space-between; align-items:center;
    gap:10px; flex-wrap:wrap; list-style:none;
  }}
  .prompt-box summary::-webkit-details-marker{{display:none}}
  .prompt-box summary::before{{content:"▸ "; color:var(--accent)}}
  .prompt-box[open] summary::before{{content:"▾ "}}
  .prompt-box summary:hover{{background:color-mix(in srgb,var(--accent) 7%,transparent)}}
  .pmeta{{
    color:var(--dim); font-size:.78rem;
    font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  }}
  .prompt-actions{{padding:0 14px; margin-top:2px}}
  .copy{{
    background:var(--card); color:var(--fg); border:1px solid var(--line);
    border-radius:7px; padding:5px 13px; font-size:.83rem; cursor:pointer;
    font-family:inherit;
  }}
  .copy:hover{{border-color:var(--accent); color:var(--accent)}}
  .copy.done{{color:var(--ok); border-color:var(--ok)}}
  .prompt-box pre{{
    margin:10px 0 0; padding:14px; overflow-x:auto;
    background:transparent; border-top:1px solid var(--line);
    font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
    font-size:.845rem; line-height:1.72; color:var(--fg);
    white-space:pre-wrap; word-wrap:break-word;
  }}

  footer{{
    margin-top:56px; padding:30px 0 48px; border-top:1px solid var(--line);
    color:var(--dim); font-size:.86rem; text-align:center;
  }}
  footer a{{color:var(--accent)}}

  @media (max-width:600px){{
    .wrap{{padding:0 15px}}
    .hero{{padding:52px 0 42px}}
    section{{padding:42px 0 6px}}
    .case{{padding:15px; border-radius:12px}}
    .case h3{{font-size:1.04rem}}
    .player.vertical{{max-width:100%}}
    .prompt-box pre{{font-size:.8rem}}
  }}
</style>
</head>
<body>

<button class="theme-toggle" id="themeToggle" type="button"
        aria-label="切换深色 / 浅色主题" title="切换深色 / 浅色主题">
  <span class="ico" id="icoDark">🌙</span>
  <span class="ico" id="icoLight">☀️</span>
  <span class="lbl" id="themeLabel">深色</span>
</button>

<div class="hero">
  <div class="wrap">
    <h1>MiniMax-H3 作品展示</h1>
    <p class="sub">开源版 MiniMax-H3 视频生成模型的复现作品集。
       每个案例都附完整 prompt 原文与逐条判定结论 —— 包括没做到的部分。</p>
    <div class="stats">
      <span class="stat">共 <b>{len(cases)}</b> 个案例</span>
      <span class="stat">复现成功 <b>{n_ok}</b></span>
      <span class="stat">部分成功 <b>{n_warn}</b></span>
      <span class="stat">NaN / 黑帧 <b>0</b></span>
    </div>
  </div>
</div>

<div class="wrap">

<section id="about">
  <h2>关于 MiniMax-H3</h2>
  <p class="lead">
    MiniMax-H3 是 MiniMax 开源的视频生成模型，特点是<b>原生同时生成画面与音频</b>——
    对白、环境声与配乐在一次推理里同时产出，不需要事后配音。
  </p>

  <div class="intro-grid">
    <div class="tile">
      <h4>五种生成模式</h4>
      <p><code>T2VA</code> 纯文生视频 · <code>I2VA</code> 单图驱动 ·
         <code>FL2VA</code> 首尾帧驱动 · <code>L2VA</code> 尾帧驱动 ·
         <code>Ref2VA</code> 参考图 / 参考视频 / 参考音频驱动</p>
    </div>
    <div class="tile">
      <h4>画面与音频同源</h4>
      <p>音频不是后期贴上去的：prompt 里描述的音效节点会与画面事件对齐，
         口型也能与新增对白同步。</p>
    </div>
    <div class="tile">
      <h4>帧数走固定网格</h4>
      <p>可用帧数为 <code>17k+5</code>：107 / 124 / … / 362。
         最长约 15.08 秒，本站 C-004 就是跑在 362 帧上限。</p>
    </div>
    <div class="tile">
      <h4>原生分辨率</h4>
      <p>768 为短边，横屏 <code>1344×768</code>、竖屏 <code>768×1344</code>。
         本站成片全部按原生分辨率直出，未做放大。</p>
    </div>
  </div>

  <p class="lead" style="margin-top:22px">
    需要说明的是：官方托管服务里有一层名为 <b>H3-Context-IR</b> 的提示词预处理，
    开源版本并不包含。因此网上流传的一些很短的 prompt 在开源版直跑，
    效果会与演示不同 —— 本站所有 prompt 都是<b>在开源版上实际跑通</b>的原文。
  </p>
</section>

<section id="official">
  <h2>官方基准案例</h2>
  <p class="lead">来自 MiniMax 官方仓库的可复现脚本，用于校准环境与接线是否正确。
     三条全部复现成功。</p>
  {official}
</section>

<section id="community">
  <h2>社区案例复现</h2>
  <p class="lead">社区流传的优秀 prompt 在开源版上的实跑结果。
     标注「部分成功」的案例，说明中写明了具体是哪一项没有达成。</p>
  {community}
</section>

<footer>
  <div class="wrap">
    <p>全部成片由开源版 MiniMax-H3 在本地 GPU 生成，<b>seed=0</b>，未经挑选或重跑择优。<br>
       每条 prompt 均标注 sha256 前 12 位，与复现记录一一对应。</p>
  </div>
</footer>

</div>

<script>
/* ---------- 主题切换 ---------- */
(function () {{
  var root = document.documentElement;
  var btn = document.getElementById('themeToggle');
  var lbl = document.getElementById('themeLabel');
  var icoD = document.getElementById('icoDark');
  var icoL = document.getElementById('icoLight');
  var meta = document.querySelector('meta[name="theme-color"]');

  function current() {{
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }}
  function paint() {{
    var t = current();
    icoD.classList.toggle('on', t === 'dark');
    icoL.classList.toggle('on', t === 'light');
    lbl.textContent = t === 'dark' ? '深色' : '浅色';
    btn.setAttribute('aria-pressed', String(t === 'light'));
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0b0d12' : '#f6f7fb');
  }}
  btn.addEventListener('click', function () {{
    var next = current() === 'dark' ? 'light' : 'dark';
    if (next === 'dark') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', 'light');
    try {{ localStorage.setItem('h3-theme', next); }} catch (e) {{}}
    paint();
  }});
  paint();
}})();

/* ---------- 复制 prompt ---------- */
document.addEventListener('click', function (e) {{
  var btn = e.target.closest('.copy');
  if (!btn) return;
  var pre = document.getElementById(btn.dataset.target);
  if (!pre) return;
  var text = pre.textContent;
  var done = function () {{
    var old = btn.textContent;
    btn.textContent = '已复制';
    btn.classList.add('done');
    setTimeout(function () {{ btn.textContent = old; btn.classList.remove('done'); }}, 1600);
  }};
  if (navigator.clipboard && window.isSecureContext) {{
    navigator.clipboard.writeText(text).then(done, fallback);
  }} else {{ fallback(); }}
  function fallback() {{
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {{ document.execCommand('copy'); done(); }} catch (err) {{}}
    document.body.removeChild(ta);
  }}
}});

// 同一时间只播一条，避免多条视频同时出声
document.addEventListener('play', function (e) {{
  if (e.target.tagName !== 'VIDEO') return;
  document.querySelectorAll('video').forEach(function (v) {{
    if (v !== e.target) v.pause();
  }});
}}, true);
</script>

</body>
</html>
"""

(ROOT / "index.html").write_text(HTML, encoding="utf-8")
print(f"index.html 写出 {len(HTML)} 字节，{len(cases)} 个案例")

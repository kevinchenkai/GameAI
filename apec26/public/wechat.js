'use strict';
// Keep ordinary browser links; offer QR/copy paths inside WeChat's web-view.
function inWechat() { return /MicroMessenger/i.test(navigator.userAgent) || window.__wxjs_environment === 'miniprogram'; }

contactsV3 = function(context = '') {
  return `<div class="real-contacts"><div class="contact-heading"><span class="eyebrow">LET’S TALK</span><h4>${say('联系，聊聊你的计划', 'Let’s talk about your plans')}</h4>${context ? `<p>${esc(context)}</p>` : ''}${inWechat() ? `<p>${say('可保存二维码，在对应 App 中识别；也可以复制联系链接。', 'Save the QR image and scan it in the matching app, or copy the contact link.')}</p>` : ''}</div>${Object.entries(CONTACTS).map(([key,c]) => `<article class="contact-option"><button class="qr-view" data-wechat="contact" data-value="${key}" aria-label="${c.label} ${say('联系二维码', 'contact QR code')}"><img src="${c.image}" alt="${c.label} QR" width="320" height="320" loading="lazy"></button><strong>${c.label}</strong>${inWechat() ? `<button class="secondary" data-wechat="contact" data-value="${key}">${say('二维码与联系链接', 'QR & contact link')}</button>` : `<a class="secondary" href="${attr(c.url)}" target="_blank" rel="noopener noreferrer">${say('打开聊天', 'Open chat')} ↗</a><button class="text-button" data-wechat="contact" data-value="${key}">${say('复制链接 / 二维码', 'Copy link / QR')}</button>`}</article>`).join('')}</div>`;
};

copyV3 = async function(text, statusId, fallbackId) {
  const target = document.getElementById(statusId), field = document.getElementById(fallbackId);
  const status = value => { if (target) target.textContent = value; };
  try { await navigator.clipboard.writeText(text); status(say('已复制。', 'Copied.')); return; } catch (_) { /* Older web-views may not expose Clipboard API. */ }
  if (field) {
    field.value = text; field.focus(); field.select(); field.setSelectionRange(0, text.length);
    try { if (document.execCommand('copy')) { status(say('已复制。', 'Copied.')); return; } } catch (_) { /* Keep the selected text for manual copying. */ }
  }
  status(say('请长按文本框，选择并复制。', 'Long-press the text field, then select and copy.'));
};

function showContactWechat(key) {
  const c = CONTACTS[key]; if (!c) return;
  const node = dialogV3('contact-dialog');
  node.innerHTML = dialogHeader(c.label) + `<img class="contact-full-qr" src="${attr(c.image)}" alt="${c.label} QR"><p>${say('长按保存二维码，在对应 App 中识别或扫码联系。', 'Long-press to save the QR image, then scan it in the matching app.')}</p><label class="share-label" for="contact-link">${say('联系链接', 'Contact link')}</label><textarea id="contact-link" readonly>${esc(c.url)}</textarea><button class="secondary" data-wechat="copy-contact" data-value="${key}">${say('复制联系链接', 'Copy contact link')}</button><p id="contact-status" class="status" role="status"></p>${inWechat() ? `<p class="fine-print">${say('微信可能限制外部聊天链接；复制后可在浏览器或对应 App 中打开。', 'WeChat may restrict external chat links. Paste the link into a browser or the matching app.')}</p>` : ''}`;
  if (!node.open) node.showModal();
}

const shareRouteBeforeWechat = shareRouteV3;
shareRouteV3 = function(id) {
  const route = V3_ROUTES.find(r => r.id === id); if (!route) return;
  // Sharing from a list must also put this route in the current web-view URL.
  const previousUrl = location.href;
  history.replaceState(null, '', routeUrlV3(route));
  shareRouteBeforeWechat(id);
  document.getElementById('share-dialog').onclose = () => history.replaceState(null, '', previousUrl);
  if (inWechat()) {
    document.querySelector('#share-dialog .share-platforms').insertAdjacentHTML('beforebegin', `<p class="wechat-share-tip">${say('分享到微信：点击右上角 ···，选择转发给朋友。也可复制下面的链接或完整攻略。', 'Share in WeChat: tap ··· at the top right, then send to a friend. You can also copy the link or full itinerary below.')}</p>`);
  }
};

const renderBeforeWechat = render;
render = function() {
  renderBeforeWechat();
  const panel = document.getElementById('panel-guide');
  panel.insertAdjacentHTML('beforeend', `<section class="guide-contact-wechat">${contactsV3()}</section>`);
};

document.addEventListener('click', event => {
  const button = event.target.closest('[data-wechat]');
  if (button?.dataset.wechat === 'contact') showContactWechat(button.dataset.value);
  if (button?.dataset.wechat === 'copy-contact') {
    const c = CONTACTS[button.dataset.value]; if (c) copyV3(c.url, 'contact-status', 'contact-link');
  }
  const link = event.target.closest('#share-dialog .share-platforms a');
  if (link && inWechat()) {
    event.preventDefault();
    document.getElementById('share-status').textContent = say('请先复制攻略链接，再打开 WhatsApp 或 Telegram 粘贴发送。', 'Copy the itinerary link, then paste it into WhatsApp or Telegram.');
    document.getElementById('share-text').focus();
  }
});

render();
const routeWechat = new URLSearchParams(location.search).get('route');
if (V3_ROUTES.some(r => r.id === routeWechat)) openRouteV3(routeWechat);

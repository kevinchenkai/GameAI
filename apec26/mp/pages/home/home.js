const GUIDE_URL = 'https://g.ismayday.mobi/apec26/';
const BUILD = '0.2.0';

const TABS = ['travel', 'food', 'gifts', 'guide'];
function stateFrom(options) {
  const lang = options && options.lang === 'en' ? 'en' : 'zh';
  const route = options && typeof options.route === 'string' && /^[a-z0-9-]{1,60}$/.test(options.route) ? options.route : '';
  const tab = route ? 'travel' : options && TABS.indexOf(options.tab) >= 0 ? options.tab : 'travel';
  return { lang, route, tab };
}
function queryState(state) {
  return 'lang=' + state.lang + '&tab=' + state.tab + (state.route ? '&route=' + encodeURIComponent(state.route) : '');
}
function sharedState(url, fallback) {
  if (typeof url !== 'string' || !(url === GUIDE_URL || url.indexOf(GUIDE_URL + '?') === 0 || url.indexOf(GUIDE_URL + '#') === 0)) return stateFrom(fallback);
  const values = {};
  const query = url.split('#')[0].split('?')[1] || '';
  query.split('&').forEach(pair => {
    const parts = pair.split('=');
    try { values[decodeURIComponent(parts[0])] = decodeURIComponent(parts.slice(1).join('=')); } catch (_) { /* Ignore malformed input. */ }
  });
  const hash = url.split('#')[1];
  if (TABS.indexOf(hash) >= 0) values.tab = hash;
  return stateFrom(values);
}

Page({
  data: { src: '', lang: 'zh', route: '', tab: 'travel', failed: false, build: BUILD, retryCount: 0, errorDetails: '' },
  onLoad(options) {
    const state = stateFrom(options);
    this.setData({ lang: state.lang, route: state.route, tab: state.tab,
      src: GUIDE_URL + '?' + queryState(state) + '&mpbuild=' + BUILD + '#' + state.tab });
    if (typeof wx !== 'undefined' && wx.showShareMenu) wx.showShareMenu({ menus: ['shareAppMessage'] });
  },
  onWebLoad() {
    this.setData({ failed: false });
  },
  onWebError(event) {
    const detail = event && event.detail || {};
    const fields = ['url', 'fullUrl', 'errMsg', 'errorMessage', 'errCode', 'errorCode'];
    const details = fields.filter(key => detail[key] !== undefined)
      .map(key => key + ': ' + String(detail[key]).slice(0, 500)).join('\n');
    this.setData({ failed: true, errorDetails: details || (this.data.lang === 'en' ? 'WeChat did not provide an error reason.' : '微信未提供详细错误原因。') });
  },
  retry() {
    const retryCount = this.data.retryCount + 1;
    this.setData({ failed: false, errorDetails: '', retryCount,
      src: GUIDE_URL + '?' + queryState(this.data) + '&mpbuild=' + BUILD + '&retry=' + retryCount + '#' + this.data.tab });
  },
  onShareAppMessage(options) {
    // Share only whitelisted state from this exact guide URL, never an input URL.
    const state = sharedState(options && options.webViewUrl, this.data);
    return {
      title: state.lang === 'en' ? 'Explore Shenzhen · APEC 2026 City Guide' : '深圳，见面吧 · APEC 2026 城市旅行指南',
      path: '/pages/home/home?' + queryState(state)
    };
  }
});

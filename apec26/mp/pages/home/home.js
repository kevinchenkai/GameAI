const DEMO_URL = 'https://g.ismayday.mobi/apec26/wechat-demo/';
const BUILD = '0.1.2';

Page({
  data: { src: '', lang: 'zh', failed: false, build: BUILD, retryCount: 0, errorDetails: '' },
  onLoad(options) {
    const lang = options && options.lang === 'en' ? 'en' : 'zh';
    this.setData({ lang, src: DEMO_URL + '?lang=' + lang + '&mpbuild=' + BUILD });
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
      src: DEMO_URL + '?lang=' + this.data.lang + '&mpbuild=' + BUILD + '&retry=' + retryCount });
  },
  onShareAppMessage(options) {
    // Only accept a language from our own page; never navigate to an input URL.
    const currentUrl = options && options.webViewUrl;
    const ownPage = typeof currentUrl === 'string' &&
      (currentUrl === DEMO_URL || currentUrl.indexOf(DEMO_URL + '?') === 0 || currentUrl.indexOf(DEMO_URL + '#') === 0);
    const match = ownPage && currentUrl.match(/[?&]lang=(en|zh)(?:&|#|$)/);
    const lang = match ? match[1] : this.data.lang;
    return {
      title: lang === 'en' ? 'Hello, Shenzhen.' : '你好，深圳。',
      path: '/pages/home/home?lang=' + lang
    };
  }
});

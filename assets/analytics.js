/* GA4: basic consent; no Google script loads before opt-in. */
(() => {
  const id = 'G-M9SRZWB6Y3', key = 'hg-analytics-consent-v1';
  let choice = null, started = false;
  try { choice = localStorage.getItem(key); } catch {}
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  function start() {
    if (started) return;
    started = true;
    window['ga-disable-' + id] = false;
    window.gtag('consent','update',{analytics_storage:'granted'});
    window.gtag('js',new Date());
    window.gtag('config',id,{allow_google_signals:false,allow_ad_personalization_signals:false});
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.append(script);
  }
  function clearCookies() {
    const parts = location.hostname.split('.');
    const domains = ['', location.hostname, ...parts.map((_,i)=>'.'+parts.slice(i).join('.'))];
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.trim().split('=')[0];
      if (!/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of domains) document.cookie = name + '=; Max-Age=0; path=/' + (domain ? '; domain='+domain : '');
    }
  }
  const style = document.createElement('style');
  style.textContent = `:root{--hg-consent-ink:#173d34;--hg-consent-paper:#fffdf7}
.hg-consent{position:fixed;bottom:16px;left:16px;right:16px;max-width:640px;margin:auto;padding:20px;border:2px solid var(--hg-consent-ink);border-radius:18px;background:var(--hg-consent-paper);color:var(--hg-consent-ink);z-index:10000;box-sizing:border-box}
.hg-consent[hidden]{display:none}.hg-consent h2{font-size:20px;margin:0 0 8px;letter-spacing:normal}.hg-consent p{font-size:14px;line-height:1.5;margin:0 0 16px}.hg-consent-actions{display:flex;gap:12px;flex-wrap:wrap}
.hg-consent button,.hg-consent-settings{font:inherit;font-size:14px;min-height:44px;padding:8px 16px;border:1px solid var(--hg-consent-ink);border-radius:10px;background:var(--hg-consent-paper);color:var(--hg-consent-ink);cursor:pointer}
.hg-consent-actions button{flex:1}.hg-consent button:hover,.hg-consent-settings:hover{background:var(--hg-consent-ink);color:var(--hg-consent-paper)}
.hg-consent :focus-visible,.hg-consent-settings:focus-visible{outline:3px solid var(--hg-consent-ink);outline-offset:3px}
.hg-consent-settings{display:block;margin:16px auto}`;
  document.head.append(style);
  const banner = document.createElement('section');
  banner.className = 'hg-consent';
  banner.setAttribute('aria-label','Analytics preferences');
  banner.innerHTML = '<h2>Help us improve our games</h2><p>May we use Google Analytics cookies to understand page visits and game clicks? Google receives usage data only if you allow it. You can change your choice in Cookie settings.</p><div class="hg-consent-actions"><button type="button" data-choice="denied">No thanks</button><button type="button" data-choice="granted">Allow analytics</button></div>';
  banner.hidden = choice === 'granted' || choice === 'denied';
  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'hg-consent-settings';
  settings.textContent = 'Cookie settings';
  settings.onclick = () => { banner.hidden = false; banner.querySelector('button').focus(); };
  document.body.append(banner);
  (document.querySelector('footer') || document.body).append(settings);
  banner.addEventListener('click', event => {
    const button = event.target.closest('[data-choice]');
    if (!button) return;
    choice = button.dataset.choice;
    try { localStorage.setItem(key,choice); } catch {}
    banner.hidden = true;
    if (choice === 'granted') start();
    else {
      window['ga-disable-' + id] = true;
      if (started) window.gtag('consent','update',{analytics_storage:'denied'});
      clearCookies();
      if (started) location.reload();
    }
    settings.focus({preventScroll:true});
  });
  window.addEventListener('storage', event => {
    if (event.key === key) location.reload();
  });
  if (choice === 'granted') start();
  document.addEventListener('click', event => {
    if (choice !== 'granted') return;
    const link = event.target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.href,location.href);
    if (![location.origin,'https://www.haarlemgames.com','https://haarlemgames.com'].includes(url.origin)) return;
    const match = url.pathname.match(/^\/games\/([^/]+)\//);
    if (match) window.gtag('event',link.classList.contains('hg-player-full') ? 'game_fullscreen' : 'game_open',{game_id:match[1]});
  });
})();

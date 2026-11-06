/* Embedded game player; original game links remain usable without JavaScript. */
(() => {
  const dialog = document.createElement('dialog');
  dialog.className = 'hg-player';
  dialog.setAttribute('aria-label', 'Game player');
  dialog.innerHTML = '<div class="hg-player-bar"><strong id="hg-player-title">Game</strong><a class="hg-player-full" target="_blank" rel="noopener">Full screen</a><button type="button" class="hg-player-close" aria-label="Close game">Close</button></div><iframe title="Game" allow="autoplay; fullscreen" allowfullscreen></iframe>';
  const css = document.createElement('style');
  css.textContent = ':root{--hg-player-ink:#173d34;--hg-player-paper:#fffdf7;--hg-player-shade:rgba(10,30,24,.75)}.hg-player{padding:0;border:2px solid var(--hg-player-ink);border-radius:18px;width:min(1200px,96%);height:92vh;height:92dvh;max-width:none;max-height:96dvh;background:var(--hg-player-paper);color:var(--hg-player-ink);overflow:clip}.hg-player[open]{display:flex;flex-direction:column}.hg-player::backdrop{background:var(--hg-player-shade)}.hg-player-bar{display:flex;align-items:center;gap:16px;padding:10px 16px;flex-shrink:0;border-bottom:2px solid var(--hg-player-ink);font-family:inherit}.hg-player-bar strong{margin-right:auto;min-width:0;font-size:16px;line-height:1.3}.hg-player-bar a,.hg-player-bar button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:8px 14px;border:1px solid var(--hg-player-ink);border-radius:10px;background:var(--hg-player-paper);color:var(--hg-player-ink);font-family:inherit;font-size:14px;font-weight:600;line-height:1.2;white-space:nowrap;cursor:pointer;text-decoration:none}.hg-player-bar a:hover,.hg-player-bar button:hover{background:var(--hg-player-ink);color:var(--hg-player-paper)}.hg-player-bar :focus-visible{outline:3px solid var(--hg-player-ink);outline-offset:3px}.hg-player iframe{display:block;width:100%;flex:1;min-height:0;border:0;background:var(--hg-player-paper)}@media(max-width:600px){.hg-player{width:100%;height:100dvh;max-height:100dvh;border:0;border-radius:0}.hg-player-bar{gap:8px;padding:8px}.hg-player-bar strong{font-size:14px}.hg-player-bar a,.hg-player-bar button{padding:8px 10px}}';
  document.head.append(css);
  document.body.append(dialog);
  const frame = dialog.querySelector('iframe');
  const full = dialog.querySelector('a');
  const close = dialog.querySelector('button');
  const title = dialog.querySelector('strong');
  let opener = null, previousOverflow = '';
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    frame.removeAttribute('src');
    document.body.style.overflow = previousOverflow;
    opener?.focus({preventScroll:true});
  });
  document.addEventListener('click', event => {
    if(event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if(!link || dialog.contains(link) || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if(!['http:','https:'].includes(url.protocol) || ![location.origin,'https://www.haarlemgames.com','https://haarlemgames.com'].includes(url.origin) || !/^\/games\/[^/]+\//.test(url.pathname)) return;
    if(typeof dialog.showModal !== 'function') return;
    event.preventDefault();
    opener = link;
    const name = link.closest('article')?.querySelector('h2,h3')?.textContent || link.querySelector('h3')?.textContent || link.getAttribute('aria-label')?.replace(/^Play /,'') || 'Game';
    title.textContent = name;
    frame.title = name;
    full.href = url.href;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    frame.src = url.href;
    dialog.showModal();
    close.focus();
  });
})();
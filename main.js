(() => {
  const PHOTOS = window.PHOTOS || [];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmtDate = d => d ? d.slice(0, 7).replace('-', '.') : ''; // 年.月 だけ表示

  /* ---------- 写真を並べる ---------- */
  const order = []; // ライトボックスで順に送るための並び（ページの章の順）
  function card(p) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ph';
    b.dataset.id = p.id;
    b.innerHTML =
      `<img src="img/thumb/${p.id}.webp" width="${p.w}" height="${p.h}" loading="lazy" decoding="async" alt="${p.caption}">` +
      `<figcaption>${p.caption}</figcaption>`;
    b.addEventListener('click', () => openLb(p.id));
    return b;
  }
  document.querySelectorAll('[data-ch]').forEach(box => {
    box._cards = PHOTOS.filter(p => p.ch === box.dataset.ch).map(p => ({ p, el: card(p) }));
    if (!box.classList.contains('masonry')) box._cards.forEach(c => box.appendChild(c.el));
  });

  // 写真を列に振り分ける。いちばん短い列に順に足すので、上端がそろい、順番も左上から読める
  function layoutMasonry() {
    document.querySelectorAll('.masonry').forEach(box => {
      const w = box.clientWidth;
      const n = Math.max(1, Math.min(box._cards.length, w >= 900 ? 3 : w >= 520 ? 2 : 1));
      if (box._cols === n) return;
      box._cols = n;
      box.textContent = '';
      const cols = Array.from({ length: n }, () => {
        const c = document.createElement('div'); c.className = 'masonry__col'; box.appendChild(c); return { c, h: 0 };
      });
      box._cards.forEach(({ p, el }) => {
        const col = cols.reduce((a, b) => (b.h < a.h - 0.01 ? b : a));
        col.c.appendChild(el);
        col.h += p.h / p.w + 0.12; // 説明文の分を少し足す
      });
    });
  }
  layoutMasonry();
  addEventListener('resize', layoutMasonry);

  PHOTOS.forEach(p => order.push(p));

  /* ---------- R：スクロールで看板を掛け替える ---------- */
  const hero = document.querySelector('.hero');
  const sign = document.querySelector('.sign');
  const word = document.querySelector('.hero__word');
  let tW = 0;
  addEventListener('resize', () => { tW = 0; });
  if (document.fonts) document.fonts.ready.then(() => { tW = 0; onScroll(); });
  function heroTick() {
    const r = hero.getBoundingClientRect();
    const total = hero.offsetHeight - innerHeight;
    // 最初の15%は止まったまま、残りで掛け替え
    let p = (-r.top / total - 0.12) / 0.7;
    p = Math.min(1, Math.max(0, p));
    sign.style.setProperty('--p', p.toFixed(4));
    hero.classList.toggle('is-after', p > 0.5);
    // 看板の上から順に変わるので、T が先、K が後
    // T は看板が1.61割ほど切り替わってから、K は7割を過ぎてから。どちらもスクロールに合わせて少しずつ
    const ease = x => x * x * (3 - 2 * x);
    const t = ease(Math.min(1, Math.max(0, (p - 0.141) / 0.22)));
    const k = ease(Math.min(1, Math.max(0, (p - 0.68) / 0.16)));
    word.style.setProperty('--t', t.toFixed(3));
    // T の幅は実際のフォントで測る（ほかの文字と同じ間隔になるように）
    if (!tW) { const s = word.querySelector('.hw-t > span'); tW = s.getBoundingClientRect().width / parseFloat(getComputedStyle(word).fontSize); }
    word.style.setProperty('--tw', tW.toFixed(4) + 'em');
    word.style.setProperty('--k', k.toFixed(3));
  }

  /* ---------- フロア表示 ---------- */
  const links = [...document.querySelectorAll('.rail a')];
  const floors = [...document.querySelectorAll('[data-floor]')];
  function railTick() {
    const y = innerHeight * 0.4;
    let cur = floors[0];
    for (const f of floors) if (f.getBoundingClientRect().top <= y) cur = f;
    const id = '#' + cur.id;
    links.forEach(a => {
      const on = a.getAttribute('href') === id;
      a.classList.toggle('is-here', on);
      a.parentElement.classList.toggle('is-here', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { heroTick(); railTick(); ticking = false; });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- ルーペ ---------- */
  document.querySelectorAll('.lens').forEach(lens => {
    const glass = lens.querySelector('.lens__glass');
    const zoom = parseFloat(lens.dataset.zoom || 2.5);
    glass.style.backgroundImage = `url("${lens.dataset.src}")`;
    function place(fx, fy) {
      const w = lens.clientWidth, h = lens.clientHeight, g = glass.offsetWidth;
      glass.style.setProperty('--x', fx * 100 + '%');
      glass.style.setProperty('--y', fy * 100 + '%');
      glass.style.backgroundSize = `${w * zoom}px ${h * zoom}px`;
      glass.style.backgroundPosition = `${-(fx * w * zoom - g / 2)}px ${-(fy * h * zoom - g / 2)}px`;
    }
    lens._place = place;
    const at = e => {
      const r = lens.getBoundingClientRect();
      return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
    };
    lens.addEventListener('pointerenter', () => lens.classList.add('is-on'));
    lens.addEventListener('pointerdown', e => { lens.classList.add('is-on'); lens.classList.remove('is-moving'); place(...at(e)); });
    lens.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' && !e.buttons) return;
      lens.classList.remove('is-moving'); place(...at(e));
    });
    lens.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') lens.classList.remove('is-on'); });
  });

  document.querySelectorAll('[data-lens-goto]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lens = document.getElementById(btn.dataset.lensGoto);
      const [tx, ty] = lens.dataset.target.split(',').map(Number);
      lens.classList.add('is-on');
      if (reduce) { lens._place(tx, ty); return; }
      // 左上から目標までなめらかに動かす
      const sx = 0.15, sy = 0.3, t0 = performance.now(), dur = 1100;
      const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      (function step(now) {
        const t = Math.min(1, (now - t0) / dur), k = ease(t);
        lens._place(sx + (tx - sx) * k, sy + (ty - sy) * k);
        if (t < 1) requestAnimationFrame(step);
      })(t0);
    });
  });

  /* ---------- 5月と11月の比較 ---------- */
  const cmp = document.getElementById('compare');
  if (cmp) {
    const range = cmp.querySelector('.compare__range');
    const tagMay = cmp.querySelector('.compare__tag--before'), tagNov = cmp.querySelector('.compare__tag--after');
    // 境目より左が5月、右が11月。見えている面積が少ない方の年月をグレーに
    const set = v => {
      cmp.style.setProperty('--x', v + '%');
      tagMay.classList.toggle('is-dim', v < 50);
      tagNov.classList.toggle('is-dim', v > 50);
    };
    range.addEventListener('input', () => set(range.value));
    // 指で触ったところに境目を合わせる（縦スクロールはそのまま）
    let drag = false;
    const at = e => { const r = cmp.getBoundingClientRect(); const v = Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)); range.value = v; set(v); };
    cmp.addEventListener('pointerdown', e => { drag = true; at(e); });
    addEventListener('pointermove', e => { if (drag) at(e); });
    addEventListener('pointerup', () => { drag = false; });
  }

  /* ---------- 閉店までのカウントダウン ---------- */
  const CLOSE = new Date('2026-11-15T19:00:00+09:00').getTime();
  const exit = document.getElementById('exit');
  const cd = {};
  const els = {};
  document.querySelectorAll('#countdown [data-u]').forEach(b => els[b.dataset.u] = b);
  function cdTick() {
    const left = CLOSE - Date.now();
    if (left <= 0) {
      exit.classList.add('is-closed');
      document.getElementById('cd-label').textContent = '2026年11月15日 19:00、閉店しました。';
      return false;
    }
    const s = Math.floor(left / 1000);
    cd.d = Math.floor(s / 86400); cd.h = Math.floor(s % 86400 / 3600); cd.m = Math.floor(s % 3600 / 60); cd.s = s % 60;
    els.d.textContent = cd.d;
    els.h.textContent = String(cd.h).padStart(2, '0');
    els.m.textContent = String(cd.m).padStart(2, '0');
    els.s.textContent = String(cd.s).padStart(2, '0');
    return true;
  }
  if (cdTick()) { const iv = setInterval(() => { if (!cdTick()) clearInterval(iv); }, 1000); }

  /* ---------- ライトボックス ---------- */
  const lb = document.getElementById('lb');
  const lbImg = document.getElementById('lb-img');
  const lbCap = document.getElementById('lb-cap');
  const lbDate = document.getElementById('lb-date');
  const lbCount = document.getElementById('lb-count');
  let idx = 0, opener = null;
  function show(i) {
    idx = (i + order.length) % order.length;
    const p = order[idx];
    lbImg.src = `img/full/${p.id}.webp`;
    lbImg.alt = p.caption;
    lbCap.textContent = p.caption;
    lbDate.textContent = fmtDate(p.date);
    lbDate.dateTime = p.date.slice(0, 7);
    lbCount.textContent = `${idx + 1} / ${order.length}`;
    // 次の写真を先読み
    const n = order[(idx + 1) % order.length];
    if (n) { const im = new Image(); im.src = `img/full/${n.id}.webp`; }
  }
  function openLb(id) {
    opener = document.activeElement;
    show(order.findIndex(p => p.id === id));
    lb.showModal();
    lb.focus(); // 最初のボタンに自動でフォーカスが当たらないように
  }
  lb.querySelector('.lb__prev').addEventListener('click', () => show(idx - 1));
  lb.querySelector('.lb__next').addEventListener('click', () => show(idx + 1));
  lb.querySelector('.lb__close').addEventListener('click', () => lb.close());
  lb.addEventListener('click', e => { if (e.target === lb || e.target.tagName === 'FIGURE') lb.close(); });
  lb.addEventListener('close', () => { lbImg.removeAttribute('src'); opener && opener.focus(); });
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
  // スワイプ
  let sx = null;
  lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    sx = null;
  });
})();

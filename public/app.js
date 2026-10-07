/* HolyLoy Developments Ltd. — front-end logic (vanilla JS, talks to /api) */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- state ---------- */
const S = { lang: 'en', shares: 1, down: 20000, tab: 'register', user: null, token: null };
try { S.token = localStorage.getItem('hl-token'); const l = localStorage.getItem('holyloy-lang'); if (l === 'bn' || l === 'en') S.lang = l; } catch (e) {}

/* ---------- i18n helpers ---------- */
const L = () => DICT[S.lang];
const num = (s) => S.lang === 'bn' ? String(s).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]) : String(s);
const fmt = (n) => '৳' + num(Number(n).toLocaleString('en-IN'));
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- official package data ---------- */
const TIERS = [
  { n: '01', shares: 5,  key: 'p1', gross: 1500000, pct: 15, disc: 225000,  net: 1275000, mkt: 25000,  mktKey: 'mkt',      imm: 225000,  y27: 2000000, p27: 725000,  y28: 2500000,  p28: 1225000 },
  { n: '02', shares: 10, key: 'p2', gross: 3000000, pct: 20, disc: 600000,  net: 2400000, mkt: 100000, mktKey: 'mkt',      eff: 2300000, imm: 700000,  y27: 4000000, p27: 1500000, y28: 5000000,  p28: 2500000, featured: true },
  { n: '03', shares: 20, key: 'p3', gross: 6000000, pct: 25, disc: 1500000, net: 4500000, mkt: 300000, mktKey: 'mktBrand', imm: 1500000, y27: 8000000, p27: 3500000, y28: 10000000, p28: 5500000 }
];

/* ---------- toast / modals ---------- */
let toastT;
function toast(msg) {
  $('#toastT').textContent = msg; $('#toast').classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => $('#toast').classList.remove('show'), 3600);
}
let lastFocus = null;
function openModal(id) {
  closeModals(true); lastFocus = document.activeElement;
  $('#m-' + id).classList.add('show'); document.body.style.overflow = 'hidden';
  const f = $('#m-' + id + ' input:not([type=checkbox]), #m-' + id + ' button.btn'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 50);
}
function closeModals(keep) {
  $$('.ov.show').forEach(m => m.classList.remove('show'));
  if (!keep) { document.body.style.overflow = ''; if (lastFocus) lastFocus.focus?.(); }
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModals(); });
$$('.ov').forEach(o => o.addEventListener('mousedown', e => { if (e.target === o) closeModals(); }));
document.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) closeModals();
  const o = e.target.closest('[data-open]');
  if (o) { if (o.dataset.open === 'auth') openAuth('register'); }
});

/* ---------- API ---------- */
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (S.token) headers.Authorization = 'Bearer ' + S.token;
  let res;
  try { res = await fetch('/api' + path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined }); }
  catch (e) { throw { message: L().errNet }; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, message: data.message || L().errNet };
  return data;
}
function busy(btn, on) {
  if (on) { btn.dataset.t = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> ' + esc(L().sending); }
  else { btn.disabled = false; btn.innerHTML = btn.dataset.t || btn.innerHTML; }
}
const showErr = (el, msg) => { el.textContent = msg; el.hidden = false; };

/* ---------- renderers ---------- */
function renderStatic() {
  const d = L();
  document.documentElement.lang = S.lang;
  $$('[data-i18n]').forEach(el => { if (d[el.dataset.i18n] != null) el.textContent = d[el.dataset.i18n]; });
  $$('[data-ph]').forEach(el => el.placeholder = d[el.dataset.ph] || '');
  document.title = S.lang === 'bn' ? 'হলিলয় ডেভেলপমেন্টস লিমিটেড | স্মার্ট ল্যান্ড শেয়ার ইনভেস্টমেন্ট' : 'HolyLoy Developments Ltd. | Smart Land Share Investment';
  $('#l-en').classList.toggle('on', S.lang === 'en'); $('#l-bn').classList.toggle('on', S.lang === 'bn');
}

function renderHero() {
  const d = L();
  $('#heroBadges').innerHTML = [d.badgeStart + ' ' + fmt(300000), d.badgeInst, d.badgeBuy].map(b => `<div class="badge"><i></i>${esc(b)}</div>`).join('');
  const g = [
    { v: 300000, h: '42%', bar: 'rgba(255,255,255,.25)', l: d.lblNow },
    { v: 400000, h: '66%', bar: 'linear-gradient(180deg,#D4AF37,#C59B27)', l: d.lbl27 },
    { v: 500000, h: '92%', bar: 'linear-gradient(180deg,#34D399,#10B981)', l: d.lbl28 }];
  $('#heroBars').innerHTML = g.map((x, i) => `<div><b>${fmt(x.v)}</b><span style="height:${x.h};background:${x.bar};animation-delay:${i * .15}s"></span></div>`).join('');
  $('#heroX').innerHTML = g.map(x => `<div>${esc(x.l)}</div>`).join('');
  $('#heroGain').textContent = '+' + fmt(200000);
  $('#trust').innerHTML = [[d.trust1, fmt(15000)], [d.trust2, d.trust2v], [d.trust3, d.trust3v], [d.trust4, d.trust4v]]
    .map(([a, b]) => `<div class="it"><small>${esc(a)}</small><strong>${esc(b)}</strong></div>`).join('');
}

function renderRetail() {
  const d = L(), n = S.shares;
  $('#rTotal').textContent = fmt(300000 * n);
  $('#rLabel').textContent = num(n) + ' ' + (n > 1 ? d.shares : d.share);
  $('#rShares').textContent = num(n);
  $$('#seg button').forEach(b => { b.textContent = fmt(b.dataset.d); b.classList.toggle('on', Number(b.dataset.d) === S.down); });
  const rows = [[d.rPrice, fmt(300000)], [d.rBooking, fmt(15000 * n)], [d.rDown, fmt(S.down * n)], [d.rMonthly, fmt(10000 * n)], [d.rTenure, num(28) + ' ' + d.months]];
  $('#rRows').innerHTML = rows.map(([a, b]) => `<div class="li"><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join('');
}

function renderGrowth() {
  const d = L();
  const steps = [
    { s: 1, l: d.stepNow, v: 300000, dot: '#475569', bd: '#E2E8F0', chip: d.gainNow, cb: '#F1F5F9', cf: '#475569' },
    { s: 2, l: d.step27, v: 400000, dot: '#C59B27', bd: 'rgba(197,155,39,.4)', chip: '+' + fmt(100000) + ' ' + d.gainProfit, cb: 'rgba(16,185,129,.12)', cf: '#059669' },
    { s: 3, l: d.step28, v: 500000, dot: '#10B981', bd: 'rgba(16,185,129,.45)', chip: '+' + fmt(200000) + ' ' + d.gainProfit, cb: 'rgba(16,185,129,.12)', cf: '#059669' }];
  $('#gcards').innerHTML = steps.map(x => `<div class="gcard" style="border-color:${x.bd}"><div class="h"><div class="dot" style="background:${x.dot}">${num(x.s)}</div><span>${esc(x.l)}</span></div>
    <div class="v">${fmt(x.v)}</div><small>${esc(d.perShare)}</small><div class="chip" style="background:${x.cb};color:${x.cf}">${esc(x.chip)}</div></div>`).join('');
}

function renderTiers() {
  const d = L();
  $('#tierGrid').innerHTML = TIERS.map(p => {
    const rows = [[d[p.mktKey], p.mkt], ...(p.eff ? [[d.effective, p.eff]] : []), [d.immediate, p.imm]];
    return `<div class="tier${p.featured ? ' feat' : ''}">
      ${p.featured ? `<span class="tag">★ ${esc(S.lang === 'bn' ? 'সর্বাধিক জনপ্রিয়' : 'Most popular')}</span>` : ''}
      <div class="top2"><span class="num">${esc(d.pkg)} ${num(p.n)}</span><span class="disc">${num(p.pct)}% ${esc(d.discount)}</span></div>
      <h3>${num(p.shares)} ${esc(d.shares)}</h3><div class="sub" style="font-weight:600;font-size:14px">${esc(d[p.key])}</div>
      <div class="sub" style="margin:22px 0 4px;font-size:13px">${esc(d.netInvest)}</div><div class="net">${fmt(p.net)}</div>
      <div class="sub" style="font-size:13px;margin-top:4px">${esc(d.gross)} ${fmt(p.gross)} · (−) ${fmt(p.disc)}</div>
      <div style="margin-top:22px;border-top:1px solid ${p.featured ? 'rgba(255,255,255,.12)' : '#EEF2F7'}">${rows.map(([a, b]) => `<div class="ln"><span>${esc(a)}</span><b>${fmt(b)}</b></div>`).join('')}</div>
      <div class="proj"><div><small>${num(2027)}</small><b>${fmt(p.y27)}</b><em>${esc(d.profit)} ${fmt(p.p27)}</em></div><div><small>${num(2028)}</small><b>${fmt(p.y28)}</b><em>${esc(d.profit)} ${fmt(p.p28)}</em></div></div>
      <button class="btn ${p.featured ? 'btn-gold' : 'btn-navy'}" type="button" data-shares="${p.shares}">${esc(d.choosePkg)}</button></div>`;
  }).join('');
  $$('#tierGrid [data-shares]').forEach(b => b.onclick = () => openAuth('register', b.dataset.shares));
}

function renderOthers() {
  const d = L();
  $('#howGrid').innerHTML = [1, 2, 3, 4].map(i => `<div><div class="n">${num(i)}</div><h3>${esc(d['how' + i + 't'])}</h3><p>${esc(d['how' + i + 'b'])}</p></div>`).join('');
  $('#exItems').innerHTML = [1, 2, 3].map(i => `<div class="i"><div class="nn">${num('0' + i)}</div><div><b>${esc(d['ex' + i + 't'])}</b><p>${esc(d['ex' + i + 'b'])}</p></div></div>`).join('');
  $('#feeRows').innerHTML = [0, 1, 2, 3, 4].map(i => `<div class="fr"><span>${esc(i === 0 ? d.feeBase : d.feeYear + ' ' + num(i))}</span><div class="bar"><i style="width:${20 * (i + 1)}%"></i></div><b>${fmt(10000 * (i + 1))}</b></div>`).join('');
  const open = $$('#faqList details').map(x => x.open);
  $('#faqList').innerHTML = [1, 2, 3, 4, 5].map(i => `<details${open[i - 1] ? ' open' : ''}><summary>${esc(d['q' + i])}</summary><p>${esc(d['a' + i])}</p></details>`).join('');
  $('#demoPts').innerHTML = [d.dp1, d.dp2, d.dp3].map(t => `<div><i>✓</i>${esc(t)}</div>`).join('');
  $$('.tierSel').forEach(sel => {
    const v = sel.value || '1';
    sel.innerHTML = [[1, d.t1], [5, d.t5], [10, d.t10], [20, d.t20]].map(([a, b]) => `<option value="${a}">${esc(b)}</option>`).join('');
    sel.value = v;
  });
}

function renderAccount() {
  const d = L(), txt = S.user ? d.myAccount : d.navLogin;
  $('#acctBtn').textContent = txt; $('.acct-m').textContent = txt;
}

function renderDash() {
  const u = S.user; if (!u) return; const d = L();
  const n = u.shares, paid = u.paid || 0;
  $('#dTag').textContent = u.sandbox ? d.sbTag : d.sbReal;
  $('#dashT').textContent = d.sbWelcomeName + ' ' + u.name;
  $('#dStats').innerHTML = [[d.sbShares, num(n), '#0F172A'], [d.sbValue, fmt(300000 * n), '#11235A'], [d.sbProj, fmt(500000 * n), '#10B981']]
    .map(([a, b, c]) => `<div class="stat"><small>${esc(a)}</small><b style="color:${c}">${esc(b)}</b></div>`).join('');
  $('#dPaid').textContent = num(paid) + ' / ' + num(28);
  $('#dNext').textContent = u.sandbox ? d.sbNext : d.sbNextReal;
  $('#dNote').textContent = u.sandbox ? d.sbNote : d.sbRealNote;
  requestAnimationFrame(() => setTimeout(() => $('#dBar').style.width = (paid / 28 * 100) + '%', 80));
}

function renderAll() { renderStatic(); renderHero(); renderRetail(); renderGrowth(); renderTiers(); renderOthers(); renderAccount(); renderDash(); }

/* ---------- language ---------- */
function setLang(l) { S.lang = l; try { localStorage.setItem('holyloy-lang', l); } catch (e) {} renderAll(); }
$('#l-en').onclick = () => setLang('en'); $('#l-bn').onclick = () => setLang('bn');

/* ---------- nav ---------- */
$('#burger').onclick = () => { const o = $('#drawer').classList.toggle('open'); $('#burger').setAttribute('aria-expanded', o); };
$$('#drawer a').forEach(a => a.addEventListener('click', () => { $('#drawer').classList.remove('open'); $('#burger').setAttribute('aria-expanded', false); }));
addEventListener('scroll', () => $('#top').classList.toggle('scrolled', scrollY > 10), { passive: true });
const accountClick = () => { $('#drawer').classList.remove('open'); S.user ? (renderDash(), openModal('dash')) : openAuth('register'); };
$('#acctBtn').onclick = accountClick; $('.acct-m').onclick = accountClick;

/* ---------- retail controls ---------- */
$('#inc').onclick = () => { S.shares = Math.min(20, S.shares + 1); renderRetail(); };
$('#dec').onclick = () => { S.shares = Math.max(1, S.shares - 1); renderRetail(); };
$$('#seg button').forEach(b => b.onclick = () => { S.down = Number(b.dataset.d); renderRetail(); });

/* ---------- demo request ---------- */
let creds = { email: 'demo@holyloydev.com', password: 'HolyLoyDemo@2026' };
$('#demoForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, err = $('#demoErr'); err.hidden = true;
  const data = Object.fromEntries(new FormData(f));
  if (!data.name.trim() || !/^\S+@\S+\.\S+$/.test(data.email) || data.phone.replace(/\D/g, '').length < 8) return showErr(err, S.lang === 'bn' ? 'নাম, ইমেইল ও ফোন নম্বর সঠিকভাবে দিন।' : 'Please enter a valid name, email and phone number.');
  const btn = $('#demoBtn'); busy(btn, true);
  try {
    const r = await api('/demo-requests', { method: 'POST', body: { ...data, tier: Number(data.tier) } });
    creds = r.credentials; $('#credE').textContent = creds.email; $('#credP').textContent = creds.password;
    f.reset(); renderOthers(); openModal('demo');
  } catch (x) { showErr(err, x.message); }
  busy(btn, false);
});
$('#goSandbox').onclick = async () => {
  try { await finishLogin(await api('/login', { method: 'POST', body: creds })); } catch (x) { toast(x.message); }
};

/* ---------- auth ---------- */
function setTab(t) {
  S.tab = t;
  $('#regForm').hidden = t !== 'register'; $('#logForm').hidden = t !== 'login';
  $('#tabReg').classList.toggle('on', t === 'register'); $('#tabLog').classList.toggle('on', t === 'login');
}
function openAuth(tab, shares) {
  setTab(tab); if (shares) $('#regForm [name=shares]').value = shares;
  $$('.err').forEach(e => e.hidden = true); openModal('auth');
}
$('#tabReg').onclick = () => setTab('register'); $('#tabLog').onclick = () => setTab('login');

async function finishLogin(r) {
  S.token = r.token; S.user = r.user;
  try { localStorage.setItem('hl-token', r.token); } catch (e) {}
  renderAccount(); renderDash(); openModal('dash');
}

$('#regForm').addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target, err = $('#regErr'); err.hidden = true;
  $$('input', f).forEach(i => i.classList.remove('bad'));
  const d = Object.fromEntries(new FormData(f));
  if (d.password !== d.confirm) { f.confirm.classList.add('bad'); return showErr(err, L().errPwMatch); }
  if (!$('#agree').checked) return showErr(err, L().errAgree);
  const btn = $('#regBtn'); busy(btn, true);
  try {
    const r = await api('/investors', { method: 'POST', body: { ...d, shares: Number(d.shares), agree: true } });
    f.reset(); toast(L().toastReg); await finishLogin(r);
  } catch (x) { showErr(err, x.message); }
  busy(btn, false);
});
$('#logForm').addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target, err = $('#logErr'); err.hidden = true;
  const btn = $('#logBtn'); busy(btn, true);
  try { const r = await api('/login', { method: 'POST', body: Object.fromEntries(new FormData(f)) }); f.reset(); toast(L().toastLogin); await finishLogin(r); }
  catch (x) { showErr(err, x.message); }
  busy(btn, false);
});
$('#logoutBtn').onclick = async () => {
  try { await api('/logout', { method: 'POST' }); } catch (e) {}
  S.user = null; S.token = null; try { localStorage.removeItem('hl-token'); } catch (e) {}
  closeModals(); renderAccount(); toast(L().toastLoggedOut);
};

/* ---------- sample agreement PDF (generated in the browser) ---------- */
function buildPdf(lines) {
  const esc2 = s => s.replace(/[\\()]/g, '\\$&');
  let c = 'BT /F1 11 Tf 50 790 Td 15 TL\n'; lines.forEach(l => c += `(${esc2(l)}) Tj T*\n`); c += 'ET';
  const o = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${c.length} >>\nstream\n${c}\nendstream`];
  let p = '%PDF-1.4\n'; const off = [];
  o.forEach((x, i) => { off.push(p.length); p += `${i + 1} 0 obj\n${x}\nendobj\n`; });
  const xr = p.length;
  p += `xref\n0 ${o.length + 1}\n0000000000 65535 f \n` + off.map(x => String(x).padStart(10, '0') + ' 00000 n \n').join('');
  p += `trailer\n<< /Size ${o.length + 1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;
  return new Blob([p], { type: 'application/pdf' });
}
$('#dlPdf').onclick = () => {
  const blob = buildPdf(['HolyLoy Developments Ltd. - Land Share Investment Agreement (SAMPLE)', '',
    'Share price: BDT 3,00,000 | Booking money: BDT 15,000',
    'Down payment: BDT 20,000 (or BDT 15,000) | Monthly installment: BDT 10,000 x 28 months', '',
    '1. Ownership: Full ownership of the Land Share certificate is granted upon',
    '   completion of all 28 installments.',
    '2. Buy-back: 100% company buy-back available after 2.5 years from the full',
    '   completion of all installments.',
    '3. Transfer: Shares may be transferred to a third party with official company',
    '   authorization. Fee: BDT 10,000, increasing by BDT 10,000 per year.',
    '4. Growth policy: Share value appreciates by BDT 1,00,000 annually until project',
    '   infrastructure completion (projected, not guaranteed).', '',
    'Sample for information only. The binding agreement is issued by the company.', '',
    'Contact: +880 1919-666630 | holyloydev.bd@gmail.com | holyloydev.com',
    'House 28, Road-1, Block-A, Niketan, Gulshan, Dhaka']);
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'HolyLoy-Investment-Agreement-Sample.pdf';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast(L().downloaded);
};

/* ---------- scroll reveal ---------- */
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { threshold: .1 }) : null;
$$('.rv').forEach(el => io ? io.observe(el) : el.classList.add('in'));

/* ---------- init ---------- */
setTab('register'); renderAll();
if (S.token) api('/me').then(r => { S.user = r.user; renderAccount(); renderDash(); }).catch(() => { S.token = null; try { localStorage.removeItem('hl-token'); } catch (e) {} });
})();

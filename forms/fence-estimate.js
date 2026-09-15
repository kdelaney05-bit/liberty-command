/* The estimate, typed — the Liberty Fencing pad (Direct Graphix 0926 proof,
   page 1) with the calculator's job typed into it. One function, no
   framework: fenceEstimateHtml({ takeoff, customer, rep, repPhone, date,
   svg }) → the HTML of one letter page. Same field map as the phone app's
   printTypedEstimate (trureview-mobile App.tsx), so paper and link match.
   Rulings (Kevin, 14 Sep): nothing on the pad is redrawn; the two payments
   filled in (18 months 0%, 120 months 9.99%); the one discount they qualify
   for; the fine print one line; a field the job doesn't know stays blank. */
(function (root) {
  const FORM_PNG = 'https://kdelaney05-bit.github.io/liberty-command/forms/liberty-fencing-estimate-0926.png';
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const money = (n) => '$' + Math.round(Number(n || 0)).toLocaleString('en-US');
  function payments(total) {
    const r = 0.0999 / 12;
    return { m18: Math.round(total / 18), m120: Math.round(total * r / (1 - Math.pow(1 + r, -120))) };
  }
  const COL = {
    vinyl:   { dx: 16.5, lx: 19.6, tx: 22.8, rows: [22.8, 23.9, 25.0], cy: 25.85, sy: 26.95, gy: 28.05, bx: 9.6, by: 28.55 },
    lattice: { dx: 46.4, lx: 49.5, tx: 52.7, rows: [22.8, 23.9, 25.0], cy: 25.85, sy: 26.95, gy: 28.05, bx: 40.5, by: 28.55 },
    semi:    { dx: 73.0, lx: 76.1, tx: 79.3, rows: [22.8, 23.9, 25.0], cy: 25.85, sy: 26.95, gy: 28.05, bx: 67.5, by: 28.55 },
    alum2:   { dx: 16.5, lx: 19.6, tx: 22.8, rows: [32.75, 33.85, 34.95], cy: 35.9, sy: 37.0, gy: 38.1, bx: 9.6, by: 37.6 },
    alum3:   { dx: 47.0, lx: 50.1, tx: 53.3, rows: [32.75, 33.85, 34.95], cy: 35.9, sy: 37.0, gy: 38.1, bx: 37.5, by: 37.6 },
    wood:    { dx: 73.0, lx: 76.1, tx: 79.3, rows: [32.75, 33.85, 34.95], cy: 35.9, sy: 37.0, gy: 38.1 },
    chain:   { dx: 73.0, lx: 76.1, tx: 79.3, rows: [42.25, 43.4, 44.5], cy: 45.4, sy: 46.5, gy: 47.6 },
  };
  /* THE CARBON'S SIGNATURES, DATES AND INITIALS — every one the pad takes, as a
     tap target on the sheet (Kevin, 15 Sep: "the same thing as the carbon we
     sign now… line by line… all the current signatures, dates and initials
     signed and initialed by the customer, as easy as possible"). Order = the
     way the eye reads the page. 'ini' stamps the preset initials, 'sig' the
     preset signature, 'date' today. */
  /* Kevin, 15 Sep ~02:50 UTC, after tapping through on a phone: "it's too much."
     The link locks the customer in — SOLD — and the rep still goes out for the
     permit, the NOC and the survey, so the money clauses (balance due, late
     fee, changes cost more) and the financing initial are signed IN PERSON at
     that visit, not here. Texting consent is collected before the link ever
     goes out (Kevin: "we will have consent before they sign. redundant").
     What stays on the link: the grade choice (its own little box, the two
     pictures) and the signature; the date stamps itself. The rep's signature
     is already on the customer copy. Oasis keeps the scanned
     carbon for now; fencing and roofing get this. */
  const SPOTS = [
    { key: 'grade',     kind: 'ini',  x: 49.5, y: 68.5, w: 7,  label: 'Follow grade or flat on top: I picked one' },
    { key: 'signature', kind: 'sig',  x: 19.0, y: 81.4, w: 26, label: 'Sign here' },
    { key: 'sigdate',   kind: 'date', x: 49.5, y: 82.2, w: 10, label: 'Date', auto: true },
  ];
  /* signed in person at the permit visit, on the rep's phone — the same sheet, these spots */
  const VISIT_SPOTS = [
    { key: 'payment',   kind: 'ini',  x: 78.6, y: 69.9, w: 5,  label: 'My payment choice' },
    { key: 'balance',   kind: 'ini',  x: 18.2, y: 89.3, w: 6,  label: 'Balance due at completion · $25 a day late fee' },
    { key: 'revisions', kind: 'ini',  x: 92.6, y: 92.7, w: 5,  label: 'Changes to the design may cost more' },
  ];
  function fenceEstimateHtml(p) {
    const stamps = p.stamps || {};                    // { grade: 'DR', signature: 'Dana Reed', sigdate: 'Sep 15, 2026' }
    const spotHtml = (sp) => {
      const v = stamps[sp.key];
      if (v) return `<div class="f ${sp.kind === 'sig' ? 'sig' : sp.kind === 'date' ? 'sm' : 'ini'} stamped" data-spot="${sp.key}" style="left:${sp.x}%;top:${sp.y}%">${esc(v)}</div>`;
      if (!p.signable || sp.auto || VISIT_SPOTS.some((v) => v.key === sp.key)) return '';   // auto spots (the date) appear only once stamped
      return `<button type="button" class="spot ${sp.kind}" data-spot="${sp.key}" data-kind="${sp.kind}" style="left:${sp.x}%;top:${sp.y - 0.9}%;width:${sp.w}%" title="${esc(sp.label)}">${sp.kind === 'sig' ? 'TAP TO SIGN' : sp.kind === 'date' ? 'DATE' : 'INITIAL'}</button>`;
    };
    const t = p.takeoff || {}, cust = p.customer || {};
    const st = (t.styles || [])[0] || {};
    const prod = String(st.prod || '');
    const mat = String(st.material || (/alum/i.test(prod) ? 'aluminum' : /wood/i.test(prod) ? 'wood' : /chain/i.test(prod) ? 'chain link' : 'vinyl'));
    const h = Number(st.height_ft || 0), ft = Math.round(Number(st.linear_ft || 0));
    const color = (prod.match(/^(White and \w+|White|Tan|Khaki|Gray|Black|Bronze|Brown)/i) || [])[0] || '';
    const styleName = /lattice/i.test(prod) ? 'Lattice' : /semi/i.test(prod) ? 'Semi-privacy' : /builder/i.test(prod) ? 'Builder grade' : /3-?rail/i.test(prod) ? '3-rail' : /2-?rail/i.test(prod) ? '2-rail' : /shadow/i.test(prod) ? 'Shadow box' : /board/i.test(prod) ? 'Board on board' : /stockade/i.test(prod) ? 'Stockade' : /privacy|pvc|vinyl/i.test(prod) ? 'Privacy' : '';
    const gates = (t.gates || []).map((g) => (g.width_ft ? g.width_ft + "'" : '') + (g.kind === 'double' ? ' dbl' : '')).filter(Boolean);
    const gateTxt = gates.length ? gates.length + ' × ' + gates.join(', ') : (t.gate_count ? String(t.gate_count) : '');
    const key = mat === 'aluminum' ? (/3-?rail/i.test(prod) ? 'alum3' : 'alum2') : mat === 'wood' ? 'wood' : /chain/.test(mat) ? 'chain' : /lattice/i.test(prod) ? 'lattice' : /semi/i.test(prod) ? 'semi' : 'vinyl';
    const c = COL[key];
    const rowY = h >= 6 ? c.rows[2] : h === 5 ? c.rows[1] : h === 4 ? c.rows[0] : null;
    const total = Math.round(Number(t.quote || 0));
    const prop = (t.raw && t.raw.prop) || {};
    const discM = /(\d[\d,]*)/.exec(String(prop.pDiscount || ''));
    const discAmt = discM ? Number(discM[1].replace(/,/g, '')) : 0;
    const discLabel = String(prop.pDiscType || prop.pDiscount || '').replace(/\$?\d[\d,]*/g, '').replace(/[()·:-]/g, ' ').trim();
    const after = Math.max(total - discAmt, 0);
    const pay = payments(after);
    const f = (x, y, txt, cls) => txt ? `<div class="f ${cls || ''}" style="left:${x}%;top:${y}%">${esc(txt)}</div>` : '';
    const dot = (x, y) => `<div class="dot" style="left:${x}%;top:${y}%"></div>`;
    const comments = [t.tear_out_ft ? `Remove ${Math.round(t.tear_out_ft)} ft of existing fence, haul off.` : '', t.reinstall_ft ? `Remove & reinstall ${Math.round(t.reinstall_ft)} ft.` : '', t.core_drill_holes ? `Core drill ${Math.round(t.core_drill_holes)} holes.` : '', String(prop.pComments || '').trim()]
      .filter(Boolean).join(' ').split(/\. +/).map((x, i, a) => i < a.length - 1 ? x + '.' : x).filter(Boolean).slice(0, 5);
    const svg = p.svg && String(p.svg).length > 100 ? String(p.svg) : '';
    const date = p.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `<div class="sheet">
    ${f(75.6, 5.65, date)}
    ${f(74.8, 7.05, [p.rep, p.repPhone].filter(Boolean).join(' · '))}
    ${f(9.2, 10.7, cust.name)}
    ${f(10.5, 12.0, cust.street)}
    ${f(16, 13.35, [cust.city, [cust.state, cust.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '))}
    ${f(10.4, 14.65, cust.phone)}
    ${f(9.4, 16.0, cust.email)}
    ${dot(64.8, 11.55)}
    ${rowY != null ? dot(c.dx, rowY) : ''}
    ${ft ? f(c.tx, (rowY == null ? c.rows[2] : rowY) - 0.5, String(ft), 'sm') : ''}
    ${f(c.lx, c.cy, color, 'sm')}${f(c.lx, c.sy, styleName, 'sm')}${f(c.lx, c.gy, gateTxt, 'sm')}
    ${c.bx != null && ft ? f(c.bx, c.by, ft + ' ft', 'sm') : ''}
    ${t.tear_out_ft ? f(89.5, 33.1, Math.round(t.tear_out_ft) + ' ft', 'sm') : ''}
    ${t.reinstall_ft ? f(89.5, 37.6, Math.round(t.reinstall_ft) + ' ft', 'sm') : ''}
    ${/builder/i.test(prod) ? dot(88.6, 43.35) : dot(93.9, 43.35)}
    ${svg ? `<div class="draw" style="left:4%;top:40.2%;width:50.5%;height:21.8%">${svg}</div>` : ''}
    ${comments.map((line, i) => f(58, 50.2 + i * 1.5, line, 'sm')).join('')}
    ${t.follow_grade === false ? dot(43.4, 66.6) : t.follow_grade ? dot(17.5, 66.4) : ''}
    <div class="panel pay" style="left:56.9%;top:58.05%;width:27.4%;height:14.6%">
      <div class="hd">Your payment · pick one · initial it</div>
      <div class="opt pick"><div class="l">18 months<small>0% APR · no interest · no minimum payments</small></div><div class="v">${money(pay.m18)}<small>/mo</small></div></div>
      <div class="opt"><div class="l">120 months<small>9.99% APR · the lowest payment</small></div><div class="v">${money(pay.m120)}<small>/mo</small></div></div>
      <div class="opt full"><div class="l">Or pay in full at completion · no fee on cards, get your points · no down payment</div><div class="v">${money(after)}</div></div>
      <div class="foot">Curious about the monthly? Check your options first, 60 seconds, separate from this estimate. With approved credit. Custom orders: 50% deposit.</div>
    </div>
    <div class="panel" style="left:2.6%;top:73.6%;width:81.6%;height:4.2%">
      <div class="qual">${discAmt ? `<div class="chk">✓</div><div class="t">${esc(discLabel || 'Discount')} · you qualify<small>We asked at the appointment. Veteran, senior, first responder, referral, realtor and BNI also honored, one per job.</small></div><div class="amt">−${money(discAmt)}</div>` : `<div class="t">Discounts<small>Veteran $250 · Senior $250 · First responder $250 · Friends &amp; family $150 · Magazine coupon $250 · Realtor $150 · BNI $150 · Repeat / referral $250 — one per job, ask your rep.</small></div>`}</div>
    </div>
    ${discAmt ? f(85.6, 75.4, `${discLabel || 'Discount'} −${money(discAmt)}`, 'sm') : ''}
    ${f(87, 78.4, after.toLocaleString('en-US') + '.00', 'big')}
    ${f(24.5, 83.3, p.rep, 'sm')}
    ${p.signedName && !stamps.signature ? `<div class="f sig" style="left:19%;top:81.4%">${esc(p.signedName)}</div>${f(49.5, 82.2, p.signedDate || date, 'sm')}` : ''}
    ${SPOTS.map(spotHtml).join('')}${VISIT_SPOTS.map(spotHtml).join('')}
  </div>`;
  }
  /* The stylesheet the sheet needs; scoped so it drops into any page. */
  const CSS = `
.sheet{position:relative;width:100%;max-width:816px;aspect-ratio:1400/2306;margin:0 auto;background:#fff url(${FORM_PNG}) no-repeat;background-size:100% 100%;font-family:-apple-system,"Source Sans 3","Helvetica Neue",Arial,sans-serif;container-type:inline-size;-webkit-print-color-adjust:exact;print-color-adjust:exact;overflow:hidden}
.sheet .f{position:absolute;font-size:1.3cqw;line-height:1;color:#0f2a6b;font-weight:600;white-space:nowrap}
.sheet .f.sm{font-size:1.1cqw}.sheet .f.big{font-size:2.1cqw;font-weight:700}
.sheet .f.sig{font-family:"Caveat","Segoe Script","Bradley Hand",cursive;font-size:2.6cqw;color:#1b2a5c}
.sheet .dot{position:absolute;width:1.15cqw;height:1.15cqw;border-radius:50%;background:#0f2a6b;transform:translate(-50%,-50%)}
.sheet .panel{position:absolute;background:#fff;border:0.18cqw solid #3c4a63;color:#1a1a1a;overflow:hidden;display:flex;flex-direction:column}
.sheet .panel .hd{background:#3c4a63;color:#fff;font-weight:700;font-size:1.2cqw;letter-spacing:.08em;text-transform:uppercase;padding:0.45cqw 0.9cqw}
.sheet .opt{flex:1 1 0;display:grid;grid-template-columns:1fr auto;align-items:center;gap:0.6cqw;padding:0.3cqw 1cqw;border-top:0.12cqw solid #d9d9d9}
.sheet .opt .l{font-size:1.45cqw;font-weight:700;line-height:1.1}.sheet .opt .l small{display:block;font-size:0.95cqw;font-weight:400;color:#555}
.sheet .opt .v{font-size:3.2cqw;font-weight:700;color:#0f2a6b;line-height:1;white-space:nowrap}.sheet .opt .v small{font-size:1.2cqw;font-weight:600;color:#555;margin-left:0.2cqw}
.sheet .opt.pick{background:#f7f3d7}.sheet .opt.full{flex:0 0 auto;background:#f4f4f4}.sheet .opt.full .l{font-size:1.05cqw;font-weight:600}.sheet .opt.full .v{font-size:1.6cqw}
.sheet .foot{flex:0 0 auto;font-size:0.8cqw;color:#666;padding:0.25cqw 1cqw 0.35cqw}
.sheet .qual{display:grid;grid-template-columns:auto 1fr auto;gap:1cqw;align-items:center;padding:0.6cqw 1cqw;flex:1}
.sheet .qual .chk{width:2.4cqw;height:2.4cqw;border-radius:50%;background:#1f6f4a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.5cqw;font-weight:700}
.sheet .qual .t{font-size:1.5cqw;font-weight:700;line-height:1.1}.sheet .qual .t small{display:block;font-size:0.95cqw;font-weight:400;color:#555;margin-top:0.2cqw}
.sheet .qual .amt{font-size:2.3cqw;font-weight:700;color:#0f2a6b;white-space:nowrap}
.sheet .draw{position:absolute}.sheet .draw svg{width:100%;height:100%;display:block}
.sheet .f.ini{font-family:"Caveat","Segoe Script","Bradley Hand",cursive;font-size:1.9cqw;color:#1b2a5c;font-weight:600}
.sheet .f.stamped{animation:stampIn .25s ease-out}
@keyframes stampIn{from{transform:scale(1.6);opacity:0}to{transform:scale(1);opacity:1}}
.sheet .spot{position:absolute;height:2.4cqw;border:0.18cqw solid #1f6f4a;background:rgba(31,111,74,.12);color:#1f6f4a;border-radius:0.5cqw;font:700 0.95cqw/1 "Source Sans 3",system-ui,sans-serif;letter-spacing:.1em;cursor:pointer;padding:0}
.sheet .spot.sig{height:3.2cqw;font-size:1.1cqw;background:rgba(31,111,74,.16)}
.sheet .spot.next{background:#1f6f4a;color:#fff}
@keyframes spotPulse{0%,100%{box-shadow:0 0 0 0 rgba(31,111,74,.35)}50%{box-shadow:0 0 0 0.6cqw rgba(31,111,74,0)}}
@media print{.sheet .spot{display:none}}
@media print{.sheet{max-width:none;width:8.5in;height:11in;box-shadow:none}@page{size:letter;margin:0}}`;
  root.fenceEstimateHtml = fenceEstimateHtml;
  root.fenceEstimateSpots = SPOTS;
  root.fenceEstimateVisitSpots = VISIT_SPOTS;
  root.fenceGradePictures = { follow: 'https://kdelaney05-bit.github.io/liberty-command/forms/grade-follow.png', flat: 'https://kdelaney05-bit.github.io/liberty-command/forms/grade-flat.png' };
  root.fenceEstimateCss = CSS;
  root.fencePayments = payments;
})(typeof window !== 'undefined' ? window : globalThis);

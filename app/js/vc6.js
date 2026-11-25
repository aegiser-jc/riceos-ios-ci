/* vc6 icon set: one outline family (24px grid, 2px round stroke, currentColor) used instead of platform emoji. window.RiceIco(name[, cls]) -> inline SVG string. */
(function () {
  'use strict';
  var P = {
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    sprout: '<path d="M12 21v-9M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 14c0-3.5 2.5-5.5 7-5.5 0 3.5-2.5 5.5-7 5.5z"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    wallet: '<path d="M4 7h14a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h11"/><circle cx="16" cy="13.5" r="1.3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
    rain: '<path d="M7 15a4.5 4.5 0 01.6-9A5.5 5.5 0 0118 8a3.5 3.5 0 011 7H7zM9 18l-1 3M13 18l-1 3M17 18l-1 3"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/>',
    bell: '<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15zM10 20a2 2 0 004 0"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.5"/>',
    leaf: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15zM5 19l8-8"/>',
    spot: '<circle cx="9" cy="10" r="3"/><circle cx="16" cy="15" r="2.2"/><circle cx="15" cy="7" r="1.4"/><path d="M4 20h16"/>',
    lodge: '<path d="M4 20c4 0 6-2 7-6M11 14C9 11 7 8 7 4M11 14c2-3 5-4 9-3M11 14c3 0 6 1 9 4"/>',
    bug: '<ellipse cx="12" cy="14" rx="4.5" ry="6"/><path d="M12 8V5M9 6l-2-2M15 6l2-2M7.5 12H3M16.5 12H21M8 17l-3 2M16 17l3 2M12 10v10"/>',
    gift: '<rect x="3" y="9" width="18" height="4" rx="1"/><path d="M5 13v7h14v-7M12 9v11M12 9c-3 0-5-1-5-3s3-2 5 3c2-5 5-5 5-3s-2 3-5 3z"/>',
    badge: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 21l5-3 5 3-1.5-7M9.5 9l2 2 3-3.5"/>',
    shirt: '<path d="M8 4L3 7l2.5 4L8 10v10h8V10l2.5 1L21 7l-5-3c-.7 1.5-2 2.2-4 2.2S8.7 5.5 8 4z"/>',
    tube: '<path d="M9 3h6v2l-1 1v12a2 2 0 01-4 0V6L9 5zM10 10h4M10 14h4"/>',
    sack: '<path d="M9 3h6l-1 3c3 2 5 5 5 9 0 3-2 6-7 6s-7-3-7-6c0-4 2-7 5-9zM9 6h6M9.5 14h5M12 11.5v5"/>',
    cert: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M7 8h10M7 11h6M16 15l-1 6 2-1.2 2 1.2-1-6"/>',
    book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19a2 2 0 012-2h13M9 7h6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8.5 13l2.5 2.5 4.5-5"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    pencil: '<path d="M4 20l1-4L16 5a2.1 2.1 0 013 3L8 19zM14 7l3 3"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    chart: '<path d="M4 4v16h16M8 16v-4M12 16V8M16 16v-6"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    warn: '<path d="M12 3.5l9.5 17h-19zM12 10v4.5M12 17.5v.01"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/>'
  };
  window.RiceIco = function (n, cls) { return '<svg class="ri' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (P[n] || '') + '</svg>'; };
})();

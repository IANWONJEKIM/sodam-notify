/* 이모지 고르기 창: 한국어 검색 · 종류별 · 자주 쓴 것
   이모지 자료(emojibase, 한국어 이름)는 창을 처음 열 때만 불러와요 → 앱 첫 로딩은 그대로 */
import { esc, EMO, EMOM } from '../util.js';
import { S } from '../state.js';

var DATA = null,
  LOADING = null;
var GROUPS = [
  [0, '😀', '웃는 얼굴·감정'],
  [1, '👋', '사람·몸'],
  [3, '🐻', '동물·자연'],
  [4, '🍔', '음식·음료'],
  [5, '✈️', '여행·장소'],
  [6, '⚽', '활동'],
  [7, '💡', '사물'],
  [8, '❤️', '기호'],
  [9, '🏳️', '깃발'],
];
function loadEmoji() {
  if (DATA) return Promise.resolve(DATA);
  if (!LOADING)
    LOADING = import('emojibase-data/ko/compact.json').then(function (m) {
      var L = m.default || m;
      DATA = L.filter(function (e) {
        return e.group != null && e.group !== 2 && e.unicode;
      })
        .sort(function (a, b) {
          return (a.order || 0) - (b.order || 0);
        })
        .map(function (e) {
          return {
            u: e.unicode,
            h: e.hexcode,
            g: e.group,
            k: (e.label + ' ' + (e.tags || []).join(' ') + ' ' + (e.emoticon || '')).toLowerCase(),
          };
        });
      return DATA;
    });
  return LOADING;
}

/* 반응 키: 예전 6개는 그대로(like·heart…), 그 밖의 이모지는 'e' + 코드 (예: e1F600, e1F44F_1F3FB) */
function reKey(hex) {
  var u = hexToEmo(hex);
  for (var i = 0; i < EMO.length; i++) if (EMO[i][1] === u || EMO[i][1].replace(/️/g, '') === u) return EMO[i][0];
  return 'e' + String(hex).replace(/-/g, '_');
}
function hexToEmo(hex) {
  return String(hex)
    .split(/[-_]/)
    .map(function (c) {
      return String.fromCodePoint(parseInt(c, 16));
    })
    .join('');
}
/* 반응 키 → 보여 줄 이모지 */
function emoOf(key) {
  if (EMOM[key]) return EMOM[key];
  if (/^e[0-9A-Fa-f_]+$/.test(key)) {
    try {
      return hexToEmo(key.slice(1));
    } catch (e) {
      return '❔';
    }
  }
  return '❔';
}

/* 자주 쓴 이모지 (이 기기에 기억) */
var RK = 'sodam.emo.recent';
function recent() {
  try {
    return JSON.parse(localStorage.getItem(RK) || '[]');
  } catch (e) {
    return [];
  }
}
function remember(hex) {
  var L = recent().filter(function (h) {
    return h !== hex;
  });
  L.unshift(hex);
  try {
    localStorage.setItem(RK, JSON.stringify(L.slice(0, 24)));
  } catch (e) {}
}

function cell(e) {
  return (
    '<button data-act="epick" data-v="' + esc(e.h) + '" title="' + esc(e.k.split(' ')[0]) + '">' + e.u + '</button>'
  );
}
/* 창 안의 이모지 목록 (검색하면 목록만 바꿔요: 한글 입력이 끊기지 않게) */
function gridHTML() {
  if (!DATA) return '<p class="muted small ep-load">이모지를 불러오는 중…</p>';
  var q = String((S.ep && S.ep.q) || '')
    .trim()
    .toLowerCase();
  if (q) {
    var F = DATA.filter(function (e) {
      return e.k.indexOf(q) >= 0;
    }).slice(0, 200);
    return F.length
      ? '<div class="ep-cells">' + F.map(cell).join('') + '</div>'
      : '<p class="muted small ep-load">"' + esc(q) + '" 이모지가 없어요</p>';
  }
  var by = {};
  DATA.forEach(function (e) {
    (by[e.g] = by[e.g] || []).push(e);
  });
  var R = recent()
      .map(function (h) {
        return (
          DATA.filter(function (e) {
            return e.h === h;
          })[0] || null
        );
      })
      .filter(Boolean),
    h = '';
  if (R.length) h += '<h4 id="epg-r">자주 쓴 이모지</h4><div class="ep-cells">' + R.map(cell).join('') + '</div>';
  GROUPS.forEach(function (g) {
    if (!by[g[0]]) return;
    h += '<h4 id="epg-' + g[0] + '">' + g[2] + '</h4><div class="ep-cells">' + by[g[0]].map(cell).join('') + '</div>';
  });
  return h;
}
function pickerHTML() {
  var ep = S.ep;
  return (
    '<div class="ovbg" data-act="ovclose"></div><div class="dlg ep" role="dialog" aria-label="이모지 고르기"><div class="dlg-hd"><h3>' +
    (ep.mode === 're' ? '반응 고르기' : '이모지 넣기') +
    '</h3><button class="btn sm ghost" data-act="ovclose">닫기</button></div>' +
    '<input class="inp" id="ep-q" type="search" placeholder="이모지 찾기 (예: 하트, 박수, 고양이)" autocomplete="off" value="' +
    esc(ep.q || '') +
    '"><div class="ep-tabs">' +
    GROUPS.map(function (g) {
      return (
        '<button data-act="epgo" data-v="' +
        g[0] +
        '" title="' +
        g[2] +
        '" aria-label="' +
        g[2] +
        '">' +
        g[1] +
        '</button>'
      );
    }).join('') +
    '</div><div class="ep-grid" id="ep-grid">' +
    gridHTML() +
    '</div></div>'
  );
}

export { loadEmoji, pickerHTML, gridHTML, reKey, emoOf, hexToEmo, remember };

/* 사이드바 메뉴: 채널·DM 메뉴(⋯ · 오른쪽 클릭 · 길게 누르기) · 섹션 메뉴 · 새 섹션 */
import { esc } from '../util.js';
import { chan, dm, dmName, joined, S } from '../state.js';
import { side, secOf } from '../side.js';

function keyName(k) {
  if (k.indexOf('c_') === 0) {
    var c = chan(k.slice(2));
    return c ? (c.kind === 'proj' ? '▦ ' : c.priv ? '🔒 ' : '# ') + c.name : '';
  }
  var d = dm(k.slice(2));
  return d ? '💬 ' + dmName(d) : '';
}
function it(act, icon, label, extra, cls) {
  return (
    '<button data-act="' +
    act +
    '"' +
    (extra || '') +
    (cls ? ' class="' + cls + '"' : '') +
    '><span>' +
    icon +
    '</span>' +
    label +
    '</button>'
  );
}
/* 채널·DM 메뉴 */
function itemMenuHTML() {
  var k = S.sim.k,
    sd = side(),
    fav = sd.fav.indexOf(k) >= 0,
    mu = sd.mute.indexOf(k) >= 0,
    cur = secOf(k, sd),
    c = k.indexOf('c_') === 0 ? chan(k.slice(2)) : null,
    dd = k.indexOf('d_') === 0 ? dm(k.slice(2)) : null,
    gdm = dd && dd.g ? dd : null,
    g = S.sim.g,
    V = ' data-v="' + esc(k) + '"';
  var h =
    '<div class="ovbg" data-act="ovclose"></div><div class="sheet" role="dialog" aria-label="메뉴"><div class="grab"></div><div class="sheet-q"><b>' +
    esc(keyName(k)) +
    '</b></div><div class="sheet-list">';
  if (S.sim.pick) {
    /* 섹션 고르기 */
    h +=
      sd.secs
        .map(function (x) {
          return it(
            'simto',
            x.id === cur ? '✓' : '📁',
            esc(x.name),
            V + ' data-s="' + esc(x.id) + '"',
            x.id === cur ? 'on' : '',
          );
        })
        .join('') +
      it('secnew', '＋', '새 섹션 만들기…', V) +
      (cur || fav ? it('simto', '↩', '원래 자리로 (섹션에서 빼기)', V + ' data-s=""') : '') +
      '</div><button class="btn ghost sheet-x" data-act="simback">뒤로</button></div>';
    return h;
  }
  h +=
    it('simfav', '⭐', fav ? '즐겨찾기에서 빼기' : '즐겨찾기', V) +
    it('simpick', '📁', '섹션으로 옮기기' + (cur ? ' · 지금: ' + esc(sectionName(cur)) : ''), V) +
    it('simmute', mu ? '🔔' : '🔕', mu ? '음소거 풀기' : '음소거', V) +
    it('reord', '↕', '순서 바꾸기', ' data-v="' + esc(g) + '"') +
    (c && joined(c)
      ? it('cleave', '🚪', c.kind === 'proj' ? '프로젝트 나가기' : '채널 나가기', ' data-id="' + esc(c.id) + '"', 'bad')
      : '') +
    /* DM: 내 목록에서 닫기 · 그룹 DM은 나가기도 */
    (k.indexOf('d_') === 0 ? it('dmclose', '🙈', '대화 닫기 (내 목록에서만)', V) : '') +
    (gdm ? it('dmleave', '🚪', '그룹 DM 나가기', ' data-id="' + esc(gdm.id) + '"', 'bad') : '') +
    '</div><button class="btn ghost sheet-x" data-act="ovclose">닫기</button></div>';
  return h;
}
function sectionName(id) {
  var x = side().secs.filter(function (s) {
    return s.id === id;
  })[0];
  return x ? x.name : '';
}
/* 섹션 메뉴 */
function secMenuHTML() {
  var id = S.secm,
    sd = side(),
    i = sd.secs.findIndex(function (x) {
      return x.id === id;
    }),
    V = ' data-v="' + esc(id) + '"';
  if (i < 0) return '';
  return (
    '<div class="ovbg" data-act="ovclose"></div><div class="sheet" role="dialog" aria-label="섹션 메뉴"><div class="grab"></div><div class="sheet-q"><b>📁 ' +
    esc(sd.secs[i].name) +
    '</b></div><div class="row"><input class="inp" id="sec-name" maxlength="20" value="' +
    esc(sd.secs[i].name) +
    '" aria-label="섹션 이름"><button class="btn" data-act="secren"' +
    V +
    '>이름 바꾸기</button></div><div class="sheet-list">' +
    (i > 0 ? it('secup', '↑', '섹션 위로', V) : '') +
    (i < sd.secs.length - 1 ? it('secdn', '↓', '섹션 아래로', V) : '') +
    it('reord', '↕', '안의 순서 바꾸기', V) +
    it('secdel', '🗑', '섹션 지우기 (안의 채널은 원래 자리로)', V, 'bad') +
    '</div><button class="btn ghost sheet-x" data-act="ovclose">닫기</button></div>'
  );
}
/* 새 섹션 이름 적기 */
function secNewHTML() {
  return (
    '<div class="ovbg" data-act="ovclose"></div><div class="dlg" role="dialog" aria-label="새 섹션"><div class="dlg-hd"><h3>새 섹션</h3><button class="btn sm ghost" data-act="ovclose">닫기</button></div>' +
    '<input class="inp" id="sec-new" maxlength="20" placeholder="예: 매장 운영, MD, 자주 보는 DM" autocomplete="off">' +
    (S.secnew.k
      ? '<p class="small muted" style="margin:0">' + esc(keyName(S.secnew.k)) + ' 을(를) 이 섹션에 넣어요.</p>'
      : '') +
    '<div class="row"><span class="sp"></span><button class="btn" data-act="secmake">만들기</button></div></div>'
  );
}

export { itemMenuHTML, secMenuHTML, secNewHTML };

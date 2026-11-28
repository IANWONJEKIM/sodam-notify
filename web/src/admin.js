/* 관리 · 새 DM · 채널 설정 */
import { db, FV } from './firebase.js';
import { esc, toast, errMsg, today, OWNER, TEAMS } from './util.js';
import { isAdmin, nameOf, userOfEmail, chan, vis, joined, sname, narrow, S } from './state.js';
import { stopConv, openConv, GMAX } from './conv.js';
import { av, pav } from './ui/common.js';
import { render } from './ui/render.js';

function adminHTML() {
  var L = Object.keys(S.staff).sort(function (a, b) {
      return String(S.staff[a].name).localeCompare(String(S.staff[b].name), 'ko');
    }),
    f = S.sf || (S.sf = { teams: [] });
  var h =
    '<div class="page"><div class="card"><h3>직원 등록</h3><p class="small muted" style="margin:0">등록한 Gmail로 구글 로그인하면 들어올 수 있어요. 지금 쓰는 워크툴 직원 명단과는 따로예요.</p>' +
    '<div class="row"><input class="inp" id="sf-name" placeholder="이름 (본명)" style="flex:1 1 140px" value="' +
    esc(f.name || '') +
    '"><input class="inp" id="sf-email" type="email" placeholder="Gmail 주소" style="flex:2 1 220px" value="' +
    esc(f.email || '') +
    '" autocomplete="off"></div>' +
    '<div class="row"><span class="small muted">팀</span><div class="chips">' +
    TEAMS.map(function (t) {
      return (
        '<button class="chip" data-act="sfteam" data-v="' +
        t +
        '" aria-pressed="' +
        (f.teams.indexOf(t) >= 0) +
        '">' +
        t +
        '</button>'
      );
    }).join('') +
    '</div><span class="sp"></span><label class="small"><input type="checkbox" id="sf-admin"' +
    (f.admin ? ' checked' : '') +
    '> 관리자</label><button class="btn" data-act="sfadd">등록</button></div></div>';
  h +=
    '<div class="card"><h3>직원 ' +
    L.length +
    '명</h3>' +
    L.map(function (e) {
      var s = S.staff[e],
        uid = userOfEmail(e),
        own = e === OWNER;
      return (
        '<div class="srow"><div class="who"><b>' +
        esc(s.name || '(이름 없음)') +
        (own ? ' <span class="pill ok">원제님</span>' : s.admin ? ' <span class="pill ok">관리자</span>' : '') +
        (s.active === false ? ' <span class="pill">비활성</span>' : '') +
        '</b><span class="small muted">' +
        esc(e) +
        ' · ' +
        (uid ? '로그인 함' : '아직 로그인 안 함') +
        '</span></div><div class="chips">' +
        TEAMS.map(function (t) {
          return (
            '<button class="chip" data-act="steam" data-e="' +
            esc(e) +
            '" data-v="' +
            t +
            '" aria-pressed="' +
            ((s.teams || []).indexOf(t) >= 0) +
            '">' +
            t +
            '</button>'
          );
        }).join('') +
        '</div>' +
        (own
          ? ''
          : '<button class="btn sm ghost" data-act="sadmin" data-e="' +
            esc(e) +
            '">' +
            (s.admin ? '관리자 해제' : '관리자로') +
            '</button><button class="btn sm ghost" data-act="sactive" data-e="' +
            esc(e) +
            '">' +
            (s.active === false ? '다시 허용' : '못 들어오게') +
            '</button>') +
        '</div>'
      );
    }).join('') +
    '</div>';
  h +=
    '<div class="card" id="chadm"><h3>채널 · 프로젝트</h3><div class="row"><button class="btn" data-act="cset" data-v="pub"># 채널</button><button class="btn" data-act="cset" data-v="priv">🔒 비공개 채널</button><button class="btn" data-act="cset" data-v="proj">▦ 프로젝트</button></div>' +
    S.channels
      .map(function (c) {
        return (
          '<div class="srow"><div class="who"><b>' +
          (c.kind === 'proj' ? '▦ ' : c.priv ? '🔒 ' : '# ') +
          esc(c.name) +
          (c.kind === 'proj' && c.done ? ' <span class="pill">완료</span>' : '') +
          '</b><span class="small muted">' +
          '멤버 ' +
          (c.mem || []).length +
          '명' +
          (joined(c) ? '' : ' · 나는 멤버 아님') +
          (c.topic ? ' · ' : '') +
          esc(c.topic || '') +
          '</span></div><button class="btn sm ghost" data-act="cset" data-id="' +
          esc(c.id) +
          '">설정</button>' +
          (S.cdel === c.id
            ? '<button class="btn sm danger" data-act="cdel" data-id="' + esc(c.id) + '">정말 지우기</button>'
            : '<button class="btn sm ghost" data-act="cdel" data-id="' + esc(c.id) + '">지우기</button>') +
          '</div>'
        );
      })
      .join('') +
    '<p class="small muted" style="margin:0">지우면 목록에서 사라져요. 안의 메시지는 남아 있어서 필요하면 되살릴 수 있어요.</p></div>';
  return h + '</div>';
}
function newdmHTML() {
  var L = Object.keys(S.staff)
    .filter(function (e) {
      return S.staff[e].active !== false;
    })
    .sort(function (a, b) {
      return String(S.staff[a].name).localeCompare(String(S.staff[b].name), 'ko');
    });
  var sel = S.nd || (S.nd = []),
    others = sel.filter(function (u) {
      return u !== S.u.uid;
    }),
    full = others.length >= GMAX - 1;
  var go =
    '<p class="small muted" style="margin:0">' +
    (sel.length
      ? sel.map(nameOf).map(esc).join(', ') + (others.length >= 2 ? ' · 그룹 DM ' + (others.length + 1) + '명' : '')
      : '여러 명을 고르면 그룹 DM이 돼요 (나 포함 ' + GMAX + '명까지)') +
    '</p>';
  return (
    '<div class="page"><div class="card"><h3>누구와 대화할까요?</h3>' +
    go +
    '<div class="plist">' +
    L.map(function (e) {
      var uid = userOfEmail(e),
        on = uid && sel.indexOf(uid) >= 0;
      return (
        '<button data-act="dmpick" data-v="' +
        esc(uid) +
        '" aria-pressed="' +
        !!on +
        '"' +
        (uid && (on || !full || uid === S.u.uid) ? '' : ' disabled') +
        '><span class="ck" aria-hidden="true">' +
        (on ? '✓' : '') +
        '</span>' +
        (uid
          ? av(uid)
          : '<span class="av" style="background:#999">' + esc(String(S.staff[e].name || '?').slice(0, 1)) + '</span>') +
        '<span><b>' +
        esc(S.staff[e].name || e) +
        (uid === S.u.uid ? ' (나 · 메모용)' : '') +
        '</b><br><span class="small muted">' +
        (uid ? esc((S.staff[e].teams || []).join(' · ') || '') : '아직 앱에 로그인하지 않았어요') +
        '</span></span></button>'
      );
    }).join('') +
    '</div></div></div>'
  );
}
function adminAct(a, b) {
  var e = b.getAttribute('data-e'),
    id = b.getAttribute('data-id'),
    v = b.getAttribute('data-v');
  if (!isAdmin()) return;
  if (a === 'sfteam') {
    keepSf();
    var T = S.sf.teams,
      i = T.indexOf(v);
    i >= 0 ? T.splice(i, 1) : T.push(v);
    render();
    return;
  }
  if (a === 'sfadd') {
    keepSf();
    var f = S.sf,
      em = String(f.email || '')
        .trim()
        .toLowerCase();
    if (!f.name || !f.name.trim()) return toast('이름을 적어 주세요.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return toast('Gmail 주소를 확인해 주세요.');
    if (S.staff[em]) return toast('이미 등록된 Gmail이에요.');
    db.collection('staff')
      .doc(em)
      .set({
        name: f.name.trim(),
        teams: TEAMS.filter(function (t) {
          return f.teams.indexOf(t) >= 0;
        }),
        admin: !!f.admin,
        active: true,
        at: FV.serverTimestamp(),
      })
      .then(
        function () {
          S.sf = { teams: [] };
          toast(f.name.trim() + '님을 등록했어요');
          render();
        },
        function (x) {
          toast(errMsg(x));
        },
      );
    return;
  }
  if (a === 'steam') {
    var s = S.staff[e],
      T2 = (s.teams || []).slice(),
      j = T2.indexOf(v);
    j >= 0 ? T2.splice(j, 1) : T2.push(v);
    db.collection('staff')
      .doc(e)
      .update({
        teams: TEAMS.filter(function (t) {
          return T2.indexOf(t) >= 0;
        }),
      })
      .catch(function (x) {
        toast(errMsg(x));
      });
    return;
  }
  if (a === 'sadmin') {
    db.collection('staff')
      .doc(e)
      .update({ admin: !S.staff[e].admin })
      .catch(function (x) {
        toast(errMsg(x));
      });
    return;
  }
  if (a === 'sactive') {
    var on = S.staff[e].active === false;
    db.collection('staff')
      .doc(e)
      .update({ active: on })
      .then(
        function () {
          toast(on ? '다시 들어올 수 있어요' : '이제 이 계정은 못 들어와요');
        },
        function (x) {
          toast(errMsg(x));
        },
      );
    return;
  }
  if (a === 'cfpriv') {
    keepCf();
    S.cf.priv = !S.cf.priv;
    render();
    return;
  }
  if (a === 'cfmem') {
    keepCf();
    var M = S.cf.mem,
      k = M.indexOf(v);
    k >= 0 ? M.splice(k, 1) : M.push(v);
    render();
    return;
  }
  if (a === 'cfteam') {
    keepCf();
    var M2 = S.cf.mem,
      add = Object.keys(S.staff).filter(function (x) {
        return S.staff[x].active !== false && (S.staff[x].teams || []).indexOf(v) >= 0;
      }),
      allIn = add.every(function (x) {
        return M2.indexOf(x) >= 0;
      });
    add.forEach(function (x) {
      var q = M2.indexOf(x);
      if (allIn && q >= 0 && x !== S.email) M2.splice(q, 1);
      else if (!allIn && q < 0) M2.push(x);
    });
    render();
    return;
  }
  if (a === 'cfdone') {
    keepCf();
    S.cf.done = v === '1';
    render();
    return;
  }
  if (a === 'cfsave') return csetSave();
  if (a === 'cdel') {
    if (S.cdel !== id) {
      S.cdel = id;
      render();
      return;
    }
    S.cdel = null;
    db.collection('channels')
      .doc(id)
      .delete()
      .then(
        function () {
          if (S.view && (S.view.id === id || S.view.k === 'cset')) {
            stopConv();
            S.view = { k: 'admin' };
          }
          toast('지웠어요');
          render();
        },
        function (x) {
          toast(errMsg(x));
        },
      );
  }
}
/* 채널 · 비공개 채널 · 프로젝트 만들기와 설정 */
function openCset(id, kind) {
  stopConv();
  var c = id ? chan(id) : null;
  S.cdel = null;
  S.cf = c
    ? {
        id: id,
        name: c.name || '',
        topic: c.topic || '',
        priv: !!c.priv,
        kind: c.kind || '',
        mem: (c.mem || []).slice(),
        start: c.start || '',
        end: c.end || '',
        done: !!c.done,
      }
    : {
        id: '',
        name: '',
        topic: '',
        priv: kind !== 'pub',
        kind: kind === 'proj' ? 'proj' : '',
        mem: [S.email],
        start: kind === 'proj' ? today() : '',
        end: '',
        done: false,
      };
  S.cf._t = Math.random();
  S.view = { k: 'cset' };
  S.pane = 'conv';
  render();
}
function keepCf() {
  var f = S.cf;
  if (!f) return;
  ['name', 'topic', 'start', 'end'].forEach(function (k) {
    var x = document.getElementById('cf-' + k);
    if (x) f[k] = x.value;
  });
}
function csetHTML() {
  var f = S.cf,
    ed = isAdmin() || !f.id,
    proj = f.kind === 'proj',
    dis = ed ? '' : ' disabled';
  var title = f.id
    ? proj
      ? '프로젝트 설정'
      : '채널 설정'
    : proj
      ? '새 프로젝트'
      : f.priv
        ? '새 비공개 채널'
        : '새 채널';
  var h =
    '<div class="top"><button class="back" data-act="csback" aria-label="뒤로">‹</button><h2>' +
    title +
    '</h2></div><div class="page"><div class="card">';
  h +=
    '<div><p class="lbl">' +
    (proj ? '프로젝트 이름' : '채널 이름') +
    '</p><input class="inp" id="cf-name" maxlength="30" placeholder="' +
    (proj ? '예: 12월 크리스마스 팝업' : '예: 발주') +
    '" value="' +
    esc(f.name) +
    '"' +
    dis +
    '></div>';
  h +=
    '<div><p class="lbl">설명 (선택)</p><input class="inp" id="cf-topic" maxlength="120" placeholder="' +
    (proj ? '목표나 한 줄 설명' : '무슨 이야기를 하는 곳인지') +
    '" value="' +
    esc(f.topic) +
    '"' +
    dis +
    '></div>';
  if (proj)
    h +=
      '<div><p class="lbl">기간</p><div class="row"><input class="inp" id="cf-start" type="date" value="' +
      esc(f.start) +
      '" style="flex:1 1 140px"' +
      dis +
      '><span class="muted">~</span><input class="inp" id="cf-end" type="date" value="' +
      esc(f.end) +
      '" style="flex:1 1 140px"' +
      dis +
      '></div></div>' +
      (f.id
        ? '<div><p class="lbl">상태</p><div class="chips"><button class="chip" data-act="cfdone" data-v="0" aria-pressed="' +
          !f.done +
          '"' +
          dis +
          '>진행 중</button><button class="chip" data-act="cfdone" data-v="1" aria-pressed="' +
          f.done +
          '"' +
          dis +
          '>완료</button></div></div>'
        : '');
  if (!proj && !f.id && !isAdmin())
    h +=
      '<p class="small muted" style="margin:0"># 공개 채널 · 모든 직원이 찾아서 들어올 수 있어요. 비공개 채널은 관리자에게 부탁해 주세요.</p>';
  else if (!proj && !f.id && ed)
    h +=
      '<label class="row small"><input type="checkbox" data-act="cfpriv"' +
      (f.priv ? ' checked' : '') +
      '> 비공개 · 초대한 사람만 보고 쓸 수 있어요</label>';
  else if (!proj && f.id)
    h +=
      '<p class="small muted" style="margin:0">' +
      (f.priv ? '🔒 비공개 채널 · 멤버만 보고 쓸 수 있어요' : '# 공개 채널 · 모든 직원이 볼 수 있어요') +
      '</p>';
  h += '</div>';
  if (f.priv || proj) {
    var act = Object.keys(S.staff)
      .filter(function (e) {
        return S.staff[e].active !== false || f.mem.indexOf(e) >= 0;
      })
      .sort(function (a, b) {
        return String(sname(a)).localeCompare(String(sname(b)), 'ko');
      });
    h += '<div class="card"><h3>' + (proj ? '참여 인원' : '멤버') + ' ' + f.mem.length + '명</h3>';
    if (ed)
      h +=
        '<div class="row"><span class="small muted">팀 한 번에</span><div class="chips">' +
        TEAMS.map(function (t) {
          return '<button class="chip" data-act="cfteam" data-v="' + t + '">' + t + '</button>';
        }).join('') +
        '</div></div><div class="chips">' +
        act
          .map(function (e) {
            return (
              '<button class="chip" data-act="cfmem" data-v="' +
              esc(e) +
              '" aria-pressed="' +
              (f.mem.indexOf(e) >= 0) +
              '">' +
              esc(sname(e)) +
              '</button>'
            );
          })
          .join('') +
        '</div><p class="small muted" style="margin:0">아직 앱에 로그인하지 않은 직원도 넣을 수 있어요. 로그인하면 바로 보여요.</p>';
    else
      h +=
        '<div class="plist">' +
        f.mem
          .map(function (e) {
            return '<button disabled style="opacity:1">' + pav(e) + '<span>' + esc(sname(e)) + '</span></button>';
          })
          .join('') +
        '</div>';
    h += '</div>';
  }
  if (ed)
    h +=
      '<div class="row"><span class="sp"></span>' +
      (f.id
        ? S.cdel === f.id
          ? '<button class="btn danger" data-act="cdel" data-id="' + esc(f.id) + '">정말 지우기</button>'
          : '<button class="btn ghost" data-act="cdel" data-id="' + esc(f.id) + '">지우기</button>'
        : '') +
      '<button class="btn ghost" data-act="csback">취소</button><button class="btn" data-act="cfsave">' +
      (f.id ? '저장' : '만들기') +
      '</button></div>';
  return h + '</div>';
}
function csetSave() {
  keepCf();
  var f = S.cf;
  if (!f) return;
  /* 일반 직원은 새 공개 채널만 만들어요 */
  if (!isAdmin()) {
    if (f.id) return;
    f.priv = false;
    f.kind = '';
  }
  var n = String(f.name || '')
    .trim()
    .replace(/^#/, '');
  if (!n) return toast('이름을 적어 주세요.');
  if (
    S.channels.some(function (c) {
      return c.name === n && c.id !== f.id;
    })
  )
    return toast('같은 이름이 이미 있어요.');
  if (f.kind === 'proj' && f.start && f.end && f.end < f.start) return toast('끝나는 날이 시작하는 날보다 빨라요.');
  var d = {
    name: n.slice(0, 30),
    topic: String(f.topic || '')
      .trim()
      .slice(0, 120),
  };
  if (f.priv || f.kind) {
    d.mem = f.mem.slice();
    if (!d.mem.length) return toast('멤버를 한 명 이상 넣어 주세요.');
  }
  if (f.kind === 'proj') {
    d.start = f.start || '';
    d.end = f.end || '';
    d.done = !!f.done;
  }
  if (!f.id) {
    d.priv = !!(f.priv || f.kind);
    if (f.kind) d.kind = f.kind;
    if (!d.priv) d.mem = [S.email];
    if (d.priv && d.mem.indexOf(S.email) < 0) d.mem.push(S.email);
    d.ord = S.channels.length;
    d.by = S.u.uid;
    d.at = FV.serverTimestamp();
    var ref = db.collection('channels').doc();
    ref.set(d).then(
      function () {
        toast((f.kind ? '프로젝트를' : '채널을') + ' 만들었어요');
        S.cf = null;
        openConv({ k: 'c', id: ref.id, tab: f.kind ? 'task' : undefined, made: true });
      },
      function (x) {
        toast('만들지 못했어요 · ' + errMsg(x));
      },
    );
    return;
  }
  db.collection('channels')
    .doc(f.id)
    .update(d)
    .then(
      function () {
        toast('저장했어요');
        S.cf = null;
        if (d.mem && d.mem.indexOf(S.email) < 0) {
          S.view = { k: 'admin' };
          render();
        } else openConv({ k: 'c', id: f.id });
      },
      function (x) {
        toast('저장하지 못했어요 · ' + errMsg(x));
      },
    );
}
function csBack() {
  var f = S.cf;
  S.cf = null;
  S.cdel = null;
  var c = f && f.id && chan(f.id);
  if (c && vis(c)) return openConv({ k: 'c', id: c.id });
  if (isAdmin() && f && f.id) {
    S.view = { k: 'admin' };
    return render();
  }
  var f0 = S.channels.filter(joined)[0];
  if (f0 && !narrow()) return openConv({ k: 'c', id: f0.id });
  S.view = null;
  S.pane = 'list';
  render();
}
function keepSf() {
  var f = S.sf || (S.sf = { teams: [] });
  ['name', 'email'].forEach(function (k) {
    var x = document.getElementById('sf-' + k);
    if (x) f[k] = x.value;
  });
  var ad = document.getElementById('sf-admin');
  if (ad) f.admin = ad.checked;
}

export { adminHTML, newdmHTML, adminAct, openCset, keepCf, csetHTML, csetSave, csBack, keepSf };

/* 로그인 */
import { firebase, auth, db, FV } from './firebase.js';
import { esc, toast, errMsg, OWNER } from './util.js';
import { off, S, LS } from './state.js';
import { start } from './data.js';

var GSVG =
  '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
function gate(msg, showLogin, showOut) {
  document.getElementById('app').innerHTML =
    '<div class="gate"><div class="box"><img src="../icon-192.png" alt=""><h1>소담상회</h1>' +
    (msg ? '<p class="muted" style="margin:0">' + msg + '</p>' : '') +
    (showLogin
      ? '<button class="gbtn" data-act="login">' +
        GSVG +
        '구글 계정으로 로그인</button><p class="small muted" style="margin:0">관리자가 등록한 Gmail로만 들어올 수 있어요.</p>'
      : '') +
    (showOut ? '<button class="btn ghost" data-act="logout">다른 계정으로 로그인</button>' : '') +
    /* 에뮬레이터(시험용)에서만: 시험 계정으로 바로 들어가기 · 진짜 사이트 빌드에는 안 나와요 */
    (import.meta.env.VITE_EMU === '1' && (showLogin || showOut)
      ? '<div class="emuas"><p class="small muted" style="margin:0">시험용 (가짜 데이터)</p>' +
        [
          ['wonjea47@gmail.com', '김원제 (관리자)'],
          ['mina@sodam.test', '김민아'],
          ['sua@sodam.test', '이수아'],
          ['jun@sodam.test', '박준'],
        ]
          .map(function (a) {
            return '<button class="btn ghost" data-act="emuas" data-v="' + a[0] + '">' + a[1] + '</button>';
          })
          .join('') +
        '</div>'
      : '') +
    '</div></div>';
}
function login() {
  var p = new firebase.auth.GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  auth.signInWithPopup(p).catch(function (e) {
    var c = e && e.code;
    if ((c === 'auth/popup-blocked' || c === 'auth/operation-not-supported-in-environment') && !window.__INAPP)
      return auth.signInWithRedirect(p);
    if (c === 'auth/cancelled-popup-request') return;
    if (c !== 'auth/popup-closed-by-user') toast('로그인하지 못했어요 · ' + (c || errMsg(e)));
  });
}
auth.getRedirectResult &&
  auth.getRedirectResult().catch(function (e) {
    toast('로그인하지 못했어요 · ' + ((e && e.code) || ''));
  });
auth.onAuthStateChanged(function (u) {
  off();
  if (LS.CUN) {
    LS.CUN();
    LS.CUN = null;
  }
  if (LS.TUN) {
    LS.TUN();
    LS.TUN = null;
  }
  S.u = u;
  S.me = null;
  S.view = null;
  if (!u)
    return window.__INAPP
      ? gate(
          '앱 안의 브라우저에서는 구글 로그인이 안 돼요.<br><b>사파리나 크롬</b>에서 열어 주세요.<br><span class="small">오른쪽 위 ⋯ 또는 공유 버튼 → \'다른 브라우저로 열기\'</span><br><br><span class="small" style="user-select:all">' +
            esc(location.href) +
            '</span>',
        )
      : gate('', true);
  S.email = String(u.email || '').toLowerCase();
  gate('확인하는 중…');
  var ref = db.collection('staff').doc(S.email);
  ref
    .get()
    .then(function (d) {
      if (!d.exists && S.email === OWNER)
        return ref
          .set({
            name: u.displayName || '관리자',
            teams: ['MANAGER'],
            admin: true,
            active: true,
            at: FV.serverTimestamp(),
          })
          .then(function () {
            return ref.get();
          });
      return d;
    })
    .then(function (d) {
      if (!d.exists || d.data().active === false)
        return gate(
          '<b>' + esc(S.email) + '</b><br>이 계정은 등록되지 않았어요. 관리자에게 이 Gmail을 등록해 달라고 해 주세요.',
          false,
          true,
        );
      S.me = d.data();
      return db
        .collection('users')
        .doc(u.uid)
        .set(
          {
            email: S.email,
            name: S.me.name || u.displayName || '',
            photo: u.photoURL || '',
            seen: FV.serverTimestamp(),
          },
          { merge: true },
        )
        .then(start);
    })
    .catch(function (e) {
      gate('불러오지 못했어요 · ' + esc(errMsg(e)), false, true);
    });
});

export { gate, login };

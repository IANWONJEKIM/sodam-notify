/* Firebase 연결 · 설정값은 저장소 맨 위 config.js(SODAM_CFG)를 같이 써요 */
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const EMU = import.meta.env.VITE_EMU === '1';
// 에뮬레이터에서는 진짜 데이터와 섞이지 않게 'demo-' 프로젝트를 써요
firebase.initializeApp(EMU ? { ...SODAM_CFG.firebase, projectId: 'demo-sodam' } : SODAM_CFG.firebase);
export var auth = firebase.auth(),
  db = firebase.firestore(),
  FV = firebase.firestore.FieldValue;
if (EMU) {
  auth.useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
  db.useEmulator('127.0.0.1', 8080);
  console.info('[소담] 에뮬레이터에 연결했어요 (진짜 데이터 아님)');
  /* 에뮬레이터 전용: 시험 계정으로 바로 바꿔 들어가기 · __as('mina@sodam.test') */
  window.__as = function (email, name) {
    var c = firebase.auth.GoogleAuthProvider.credential(
      JSON.stringify({ sub: 'g-' + email, email: email, email_verified: true, name: name || email.split('@')[0] }),
    );
    return auth.signOut().then(function () {
      return auth.signInWithCredential(c);
    });
  };
} else {
  try {
    db.enablePersistence({ synchronizeTabs: true }).catch(function () {});
  } catch (e) {}
}
export { firebase };

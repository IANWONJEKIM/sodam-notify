/* global fetch, console */
// 에뮬레이터에 시험용 직원을 넣어요 (진짜 데이터와 상관없어요)
// 쓰는 법: npm run emu 를 켠 상태에서 npm run seed (데이터를 비우고 새로 시작해요)
// 규칙 테스트(vitest)는 시작할 때 에뮬레이터 데이터를 비워요 → 테스트 뒤엔 다시 seed 하세요.
const B = 'http://127.0.0.1:8080/v1/projects/demo-sodam/databases/(default)/documents';
const H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const S = (v) => ({ stringValue: v });
// 에뮬레이터 Firestore를 먼저 비워요 (테스트가 남긴 것까지). 로그인 계정(Auth)은 그대로예요.
await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-sodam/databases/(default)/documents', {
  method: 'DELETE',
});
console.log('에뮬레이터 데이터를 비웠어요');
const STAFF = [
  ['mina@sodam.test', '김민아', 'MD'],
  ['sua@sodam.test', '이수아', 'VMD'],
  ['jun@sodam.test', '박준', 'OPERATION'],
];
for (const [email, name, team] of STAFF) {
  const body = {
    fields: {
      name: S(name),
      teams: { arrayValue: { values: [S(team)] } },
      admin: { booleanValue: false },
      active: { booleanValue: true },
    },
  };
  const r = await fetch(`${B}/staff/${email}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) });
  console.log(r.ok ? '넣음' : '실패 ' + r.status, email, name);
}
console.log('앱에서 로그인: 화면의 가짜 구글 로그인, 또는 개발자 도구에서 __as("mina@sodam.test")');

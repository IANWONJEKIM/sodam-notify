/* 소담상회 올인원 앱 시작점 · 왼쪽 목록(채널·DM) + 가운데 대화 + 오른쪽 스레드. 휴대폰에서는 한 화면씩 넘겨 봐요 */
import './style.css';
import './firebase.js';
import './auth.js'; // 로그인 상태를 보고 화면을 시작해요
import './conv.js'; // 화면으로 돌아오면 읽음 처리
import './events.js'; // 입력 · 클릭 · 스크롤 · 화면 크기

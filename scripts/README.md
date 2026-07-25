# 스크립트

## 새 글 만들기

```bash
npm run new -- 백준 "2751번 - 수 정렬하기 2"
npm run new                                    # 대화형
```

`_posts/<카테고리>/YYYY-MM-DD-<제목>.md` 를 만들고, 만들어질 URL을 함께 보여준다.
카테고리 목록은 `_posts/` 하위 디렉토리에서 읽으므로 새 카테고리를 쓰면 알려만 주고 그대로 만든다.

## 나머지

블로그 관리 명령은 전부 `npm run` 으로 옮겼다. [최상위 README](../README.md) 참고.

- `npm run dev` — 개발 서버
- `npm run build` — 빌드
- `npm test` / `npm run verify:urls` / `npm run verify:links` — 검증

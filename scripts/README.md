# 블로그 관리 스크립트

## 새 포스트 생성
```bash
./scripts/new-post.sh [잡담|개발|리뷰] "제목"
```
카테고리는 front matter의 `categories` 필드로 자동 설정됩니다.

## 블로그 관리
```bash
./scripts/blog-manager.sh list      # 포스트 목록
./scripts/blog-manager.sh list 잡담 # 특정 카테고리 목록
./scripts/blog-manager.sh stats     # 통계
./scripts/blog-manager.sh new       # 새 포스트 (대화형)
./scripts/blog-manager.sh serve     # 로컬 서버
./scripts/blog-manager.sh build     # 빌드
```

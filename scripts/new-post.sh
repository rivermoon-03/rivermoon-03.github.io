#!/usr/bin/env bash
# 포스트 생성 스크립트
# 사용법: ./scripts/new-post.sh [카테고리] [제목]
# 예시: ./scripts/new-post.sh 잡담 "오늘의 일기"

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리
BLOG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
POSTS_DIR="${BLOG_ROOT}/_posts"

# 카테고리 목록
CATEGORIES=("잡담" "개발" "리뷰")

# 함수: 사용법 출력
usage() {
    echo -e "${BLUE}사용법:${NC}"
    echo "  $0 [카테고리] [제목]"
    echo ""
    echo -e "${BLUE}카테고리:${NC}"
    for cat in "${CATEGORIES[@]}"; do
        echo "  - $cat"
    done
    echo ""
    echo -e "${BLUE}예시:${NC}"
    echo "  $0 잡담 \"오늘의 일기\""
    echo "  $0 개발 \"Jekyll 블로그 설정하기\""
    echo "  $0 리뷰 \"좋은 책 추천\""
    exit 1
}

# 함수: 카테고리 확인
validate_category() {
    local cat="$1"
    for valid_cat in "${CATEGORIES[@]}"; do
        if [ "$cat" = "$valid_cat" ]; then
            return 0
        fi
    done
    return 1
}

# 인자 확인
if [ $# -lt 2 ]; then
    echo -e "${RED}오류: 카테고리와 제목이 필요합니다.${NC}"
    echo ""
    usage
fi

CATEGORY="$1"
TITLE="$2"

# 카테고리 검증
if ! validate_category "$CATEGORY"; then
    echo -e "${RED}오류: 잘못된 카테고리입니다.${NC}"
    echo ""
    usage
fi

# 날짜 생성 (YYYY-MM-DD 형식)
DATE=$(date +"%Y-%m-%d")
TIME=$(date +"%H:%M:%S %z")

# 파일명 생성 (제목을 URL-safe하게 변환)
# 한글, 공백, 특수문자 처리
FILENAME=$(echo "$TITLE" | \
    sed 's/ /-/g' | \
    sed 's/[^가-힣a-zA-Z0-9-]//g' | \
    tr '[:upper:]' '[:lower:]')

# 파일명이 비어있으면 기본값 사용
if [ -z "$FILENAME" ]; then
    FILENAME="untitled"
fi

# 전체 파일 경로 (_posts 루트에 직접 생성)
POST_FILE="${POSTS_DIR}/${DATE}-${FILENAME}.md"

# 파일이 이미 존재하는지 확인
if [ -f "$POST_FILE" ]; then
    echo -e "${YELLOW}경고: 파일이 이미 존재합니다: ${POST_FILE}${NC}"
    read -p "덮어쓰시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}취소되었습니다.${NC}"
        exit 1
    fi
fi

# 포스트 템플릿 생성
cat > "$POST_FILE" <<EOF
---
title: "$TITLE"
date: ${DATE} ${TIME}
categories: [${CATEGORY}]
tags: [${CATEGORY}]
---

# $TITLE


EOF

echo -e "${GREEN}✓ 포스트가 생성되었습니다!${NC}"
echo -e "${BLUE}파일 위치:${NC} ${POST_FILE}"
echo ""
echo -e "${YELLOW}다음 단계:${NC}"
echo "  1. 파일을 열어 내용을 작성하세요"
echo "  2. 저장 후 커밋하세요"
echo ""

# 기본 에디터로 파일 열기 (선택사항)
if [ -n "$EDITOR" ]; then
    read -p "에디터로 열까요? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        $EDITOR "$POST_FILE"
    fi
fi

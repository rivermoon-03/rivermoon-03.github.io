#!/usr/bin/env bash
# 블로그 관리 도구
# 사용법: ./scripts/blog-manager.sh [명령어]

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리
BLOG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
POSTS_DIR="${BLOG_ROOT}/_posts"

# 함수: 사용법 출력
usage() {
    echo -e "${BLUE}블로그 관리 도구${NC}"
    echo ""
    echo -e "${BLUE}사용법:${NC}"
    echo "  $0 [명령어]"
    echo ""
    echo -e "${BLUE}명령어:${NC}"
    echo "  list          - 모든 포스트 목록 보기"
    echo "  list [카테고리] - 특정 카테고리의 포스트 목록 보기"
    echo "  stats         - 블로그 통계 보기"
    echo "  draft         - 초안 목록 보기"
    echo "  new           - 새 포스트 생성 (대화형)"
    echo "  serve         - 로컬 서버 실행"
    echo "  build         - 블로그 빌드"
    echo ""
    exit 1
}

# 함수: 포스트 목록 출력
list_posts() {
    local category="$1"
    local search_dir="${POSTS_DIR}"
    
    if [ -n "$category" ]; then
        search_dir="${POSTS_DIR}/${category}"
        if [ ! -d "$search_dir" ]; then
            echo -e "${RED}오류: 카테고리 '${category}'를 찾을 수 없습니다.${NC}"
            exit 1
        fi
        echo -e "${CYAN}카테고리: ${category}${NC}"
    else
        echo -e "${CYAN}모든 포스트:${NC}"
    fi
    
    echo ""
    
    local count=0
    while IFS= read -r file; do
        if [ -f "$file" ] && [[ "$file" == *.md ]]; then
            count=$((count + 1))
            local filename=$(basename "$file")
            local dir=$(dirname "$file")
            local cat=$(basename "$dir")
            
            # Front matter에서 제목 추출
            local title=$(grep -m 1 "^title:" "$file" 2>/dev/null | sed 's/^title: *"\(.*\)"$/\1/' | sed "s/^title: *'\(.*\)'$/\1/")
            if [ -z "$title" ]; then
                title="$filename"
            fi
            
            # 날짜 추출
            local date=$(grep -m 1 "^date:" "$file" 2>/dev/null | sed 's/^date: *//' | cut -d' ' -f1)
            
            printf "${GREEN}%3d.${NC} " "$count"
            if [ -z "$category" ]; then
                printf "${YELLOW}[%s]${NC} " "$cat"
            fi
            printf "${BLUE}%s${NC}" "$title"
            if [ -n "$date" ]; then
                printf " ${CYAN}(%s)${NC}" "$date"
            fi
            echo ""
            echo "    ${file}"
            echo ""
        fi
    done < <(find "$search_dir" -type f -name "*.md" 2>/dev/null | sort -r)
    
    if [ $count -eq 0 ]; then
        echo -e "${YELLOW}포스트가 없습니다.${NC}"
    else
        echo -e "${GREEN}총 ${count}개의 포스트${NC}"
    fi
}

# 함수: 통계 출력
show_stats() {
    echo -e "${CYAN}블로그 통계${NC}"
    echo ""
    
    local total=0
    local 잡담=0
    local 개발=0
    local 리뷰=0
    
    for category in "잡담" "개발" "리뷰"; do
        local count=$(find "${POSTS_DIR}/${category}" -type f -name "*.md" 2>/dev/null | wc -l)
        total=$((total + count))
        
        case "$category" in
            "잡담") 잡담=$count ;;
            "개발") 개발=$count ;;
            "리뷰") 리뷰=$count ;;
        esac
        
        printf "${BLUE}%-10s:${NC} ${GREEN}%3d${NC} 개\n" "$category" "$count"
    done
    
    echo ""
    echo -e "${CYAN}총 포스트:${NC} ${GREEN}${total}${NC} 개"
    echo ""
    
    # 최근 포스트 5개
    echo -e "${CYAN}최근 포스트:${NC}"
    local recent=0
    while IFS= read -r file && [ $recent -lt 5 ]; do
        if [ -f "$file" ] && [[ "$file" == *.md ]]; then
            recent=$((recent + 1))
            local filename=$(basename "$file")
            local dir=$(dirname "$file")
            local cat=$(basename "$dir")
            local title=$(grep -m 1 "^title:" "$file" 2>/dev/null | sed 's/^title: *"\(.*\)"$/\1/' | sed "s/^title: *'\(.*\)'$/\1/")
            local date=$(grep -m 1 "^date:" "$file" 2>/dev/null | sed 's/^date: *//' | cut -d' ' -f1)
            
            if [ -z "$title" ]; then
                title="$filename"
            fi
            
            printf "  ${YELLOW}[%s]${NC} ${BLUE}%s${NC} ${CYAN}(%s)${NC}\n" "$cat" "$title" "$date"
        fi
    done < <(find "$POSTS_DIR" -type f -name "*.md" 2>/dev/null | sort -r)
}

# 함수: 새 포스트 생성 (대화형)
interactive_new_post() {
    echo -e "${CYAN}새 포스트 생성${NC}"
    echo ""
    
    # 카테고리 선택
    echo "카테고리를 선택하세요:"
    echo "  1) 잡담"
    echo "  2) 개발"
    echo "  3) 리뷰"
    read -p "선택 (1-3): " cat_choice
    
    case "$cat_choice" in
        1) CATEGORY="잡담" ;;
        2) CATEGORY="개발" ;;
        3) CATEGORY="리뷰" ;;
        *)
            echo -e "${RED}잘못된 선택입니다.${NC}"
            exit 1
            ;;
    esac
    
    # 제목 입력
    read -p "포스트 제목: " TITLE
    
    if [ -z "$TITLE" ]; then
        echo -e "${RED}오류: 제목이 필요합니다.${NC}"
        exit 1
    fi
    
    # new-post.sh 스크립트 호출
    "${BLOG_ROOT}/scripts/new-post.sh" "$CATEGORY" "$TITLE"
}

# 함수: 로컬 서버 실행
serve_blog() {
    echo -e "${CYAN}Jekyll 로컬 서버 시작...${NC}"
    echo ""
    cd "$BLOG_ROOT"
    bundle exec jekyll serve --livereload
}

# 함수: 블로그 빌드
build_blog() {
    echo -e "${CYAN}블로그 빌드 중...${NC}"
    echo ""
    cd "$BLOG_ROOT"
    bundle exec jekyll build
    echo ""
    echo -e "${GREEN}✓ 빌드 완료!${NC}"
    echo -e "빌드 결과: ${BLOG_ROOT}/_site"
}

# 메인 로직
if [ $# -eq 0 ]; then
    usage
fi

case "$1" in
    list)
        list_posts "$2"
        ;;
    stats)
        show_stats
        ;;
    new)
        interactive_new_post
        ;;
    serve)
        serve_blog
        ;;
    build)
        build_blog
        ;;
    *)
        echo -e "${RED}오류: 알 수 없는 명령어 '${1}'${NC}"
        echo ""
        usage
        ;;
esac

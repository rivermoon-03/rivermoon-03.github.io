#!/usr/bin/env ruby
# frozen_string_literal: true
#
# Jekyll 플러그인: _posts 하위 폴더의 포스트도 인식하도록 함

module Jekyll
  class PostReader
    alias_method :read_posts_orig, :read_posts

    def read_posts(dir)
      read_posts_orig(dir)
      
      # _posts의 모든 하위 디렉토리에서도 포스트 읽기
      posts_dir = File.join(@site.source, dir)
      return unless File.directory?(posts_dir)
      
      # 하위 폴더의 모든 마크다운 파일 찾기
      Dir.glob(File.join(posts_dir, "**", "*.{md,markdown,html}")).each do |file|
        next if File.directory?(file)
        
        # 파일 경로에서 _posts 이후의 경로 추출
        relative_path = file.sub(File.join(@site.source, dir) + "/", "")
        
        # 이미 읽은 포스트는 건너뛰기 (경로로 확인)
        next if @site.posts.docs.any? { |post| post.path == file }
        
        # 하위 폴더에 있는 경우에만 처리
        next unless relative_path.include?("/")
        
        # 파일명 추출 (하위 폴더 경로 포함)
        filename = File.basename(relative_path)
        
        # Post 객체 생성 시도
        begin
          # Jekyll 3.x/4.x 호환성을 위해 다양한 방법 시도
          if defined?(Jekyll::Document)
            # Jekyll 3.5+ 방식
            post = Jekyll::Document.new(file, {
              :site => @site,
              :collection => @site.collections["posts"]
            })
            @site.posts.docs << post
          else
            # Jekyll 3.x 방식
            post = Post.new(@site, @site.source, dir, relative_path)
            @site.posts.docs << post
          end
        rescue => e
          Jekyll.logger.warn "Posts from subfolders:", "Failed to load #{file}: #{e.message}"
        end
      end
    end
  end
end

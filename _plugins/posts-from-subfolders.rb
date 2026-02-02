#!/usr/bin/env ruby
# frozen_string_literal: true
#
# Jekyll 플러그인: _posts 하위 폴더의 포스트도 인식하도록 함
# Jekyll 4.x 호환 버전

module Jekyll
  class PostReader
    alias_method :read_posts_orig, :read_posts

    def read_posts(dir)
      # 원본 메서드 호출
      read_posts_orig(dir)
      
      # _posts의 모든 하위 디렉토리에서도 포스트 읽기
      posts_dir = File.join(@site.source, dir)
      return unless File.directory?(posts_dir)
      
      collection = @site.collections["posts"]
      return unless collection
      
      # 이미 읽은 파일 경로 수집
      existing_paths = collection.docs.map { |doc| doc.path }.to_set
      
      # 하위 폴더의 모든 마크다운 파일 찾기
      new_docs = []
      Dir.glob(File.join(posts_dir, "**", "*.{md,markdown,html}")).each do |file|
        next if File.directory?(file)
        next if existing_paths.include?(file)
        
        # 파일 경로에서 _posts 이후의 경로 추출
        relative_path = file.sub(File.join(@site.source, dir) + "/", "")
        
        # 하위 폴더에 있는 경우에만 처리
        next unless relative_path.include?("/")
        
        begin
          # Jekyll 4.x 방식: Document 생성
          doc = Jekyll::Document.new(file, {
            site: @site,
            collection: collection
          })
          
          new_docs << doc
          
        rescue => e
          Jekyll.logger.warn "Posts from subfolders:", "Failed to load #{file}: #{e.message}"
        end
      end
      
      # 모든 새 문서를 한 번에 추가
      collection.docs.concat(new_docs) unless new_docs.empty?
    end
  end
end

package com.portfolio.service;

import com.portfolio.dto.PostRequest;
import com.portfolio.model.Post;
import com.portfolio.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final FileStorageService fileStorageService;

    public List<Post> getAllPosts() {
        return postRepository.findAll();
    }

    public List<Post> getPostsByCategory(String categoryId) {
        return postRepository.findByCategoryId(categoryId);
    }

    public Post getPostById(Long id) {
        return postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다: " + id));
    }

    @Transactional
    public Post createPost(PostRequest request) {
        Post post = new Post();
        post.setCategoryId(request.getCategoryId());
        post.setContentType(request.getContentType());
        post.setTitle(request.getTitle());
        post.setYear(request.getYear());
        post.setMedium(request.getMedium());
        post.setSize(request.getSize());
        post.setThumbnail(request.getThumbnail());
        post.setDescription(request.getDescription());
        post.setHtmlContent(request.getHtmlContent());
        post.setImages(request.getImages());

        return postRepository.save(post);
    }

    @Transactional
    public Post updatePost(Long id, PostRequest request) {
        Post post = getPostById(id);

        // 썸네일이 변경된 경우 기존 파일 삭제
        if (post.getThumbnail() != null && !post.getThumbnail().equals(request.getThumbnail())) {
            fileStorageService.deleteFile(post.getThumbnail());
        }

        // 이미지 목록이 변경된 경우 삭제된 이미지 파일 제거
        if (post.getImages() != null && request.getImages() != null) {
            List<String> oldImages = new ArrayList<>(post.getImages());
            List<String> newImages = request.getImages();

            for (String oldImage : oldImages) {
                if (!newImages.contains(oldImage)) {
                    fileStorageService.deleteFile(oldImage);
                }
            }
        }

        post.setCategoryId(request.getCategoryId());
        post.setContentType(request.getContentType());
        post.setTitle(request.getTitle());
        post.setYear(request.getYear());
        post.setMedium(request.getMedium());
        post.setSize(request.getSize());
        post.setThumbnail(request.getThumbnail());
        post.setDescription(request.getDescription());
        post.setHtmlContent(request.getHtmlContent());
        post.setImages(request.getImages());

        return postRepository.save(post);
    }

    @Transactional
    public void deletePost(Long id) {
        Post post = getPostById(id);

        // 게시글과 연관된 모든 파일 삭제
        // 썸네일 삭제
        if (post.getThumbnail() != null) {
            fileStorageService.deleteFile(post.getThumbnail());
        }

        // 추가 이미지들 삭제
        if (post.getImages() != null && !post.getImages().isEmpty()) {
            fileStorageService.deleteFiles(post.getImages());
        }

        // 게시글 삭제
        postRepository.deleteById(id);
    }
}

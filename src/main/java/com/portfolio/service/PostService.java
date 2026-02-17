package com.portfolio.service;

import com.portfolio.dto.PostRequest;
import com.portfolio.model.Post;
import com.portfolio.model.PostImage;
import com.portfolio.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private static final Logger log = LoggerFactory.getLogger(PostService.class);

    private final PostRepository postRepository;
    private final FileStorageService fileStorageService;

    public List<Post> getAllPosts() {
        return postRepository.findAll();
    }

    public List<Post> getPostsByCategory(String categoryId) {
        return postRepository.findByCategoryIdOrderByDisplayOrderAsc(categoryId);
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
        post.setDisplayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0);

        log.info("게시글 생성: {}", request.getTitle());
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
            Set<String> newImageUrls = request.getImages().stream()
                    .map(PostImage::getImageUrl)
                    .collect(Collectors.toSet());

            for (PostImage oldImage : post.getImages()) {
                if (oldImage.getImageUrl() != null && !newImageUrls.contains(oldImage.getImageUrl())) {
                    fileStorageService.deleteFile(oldImage.getImageUrl());
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
        post.setDisplayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : post.getDisplayOrder());

        log.info("게시글 수정: id={}, title={}", id, request.getTitle());
        return postRepository.save(post);
    }

    @Transactional
    public void deletePost(Long id) {
        Post post = getPostById(id);

        if (post.getThumbnail() != null) {
            fileStorageService.deleteFile(post.getThumbnail());
        }

        if (post.getImages() != null && !post.getImages().isEmpty()) {
            List<String> imageUrls = post.getImages().stream()
                    .map(PostImage::getImageUrl)
                    .collect(Collectors.toList());
            fileStorageService.deleteFiles(imageUrls);
        }

        postRepository.deleteById(id);
        log.info("게시글 삭제: id={}", id);
    }
}

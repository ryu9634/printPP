package com.portfolio.service;

import com.portfolio.dto.PostRequest;
import com.portfolio.model.Post;
import com.portfolio.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;

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
        if (!postRepository.existsById(id)) {
            throw new RuntimeException("게시글을 찾을 수 없습니다: " + id);
        }
        postRepository.deleteById(id);
    }
}

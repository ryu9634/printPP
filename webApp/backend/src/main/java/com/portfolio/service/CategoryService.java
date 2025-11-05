package com.portfolio.service;

import com.portfolio.dto.CategoryRequest;
import com.portfolio.model.Category;
import com.portfolio.repository.CategoryRepository;
import com.portfolio.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final PostRepository postRepository;

    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    public Category getCategoryById(String id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("카테고리를 찾을 수 없습니다: " + id));
    }

    @Transactional
    public Category createCategory(CategoryRequest request) {
        // 중복 체크
        if (categoryRepository.existsById(request.getId())) {
            throw new RuntimeException("이미 존재하는 카테고리 ID입니다: " + request.getId());
        }

        Category category = new Category();
        category.setId(request.getId());
        category.setName(request.getName());
        category.setType(request.getType());

        return categoryRepository.save(category);
    }

    @Transactional
    public void deleteCategory(String id) {
        Category category = getCategoryById(id);

        // 기본 카테고리는 삭제 불가
        if ("default".equals(category.getType())) {
            throw new RuntimeException("기본 카테고리는 삭제할 수 없습니다");
        }

        // 해당 카테고리의 모든 게시글 삭제
        postRepository.deleteByCategoryId(id);

        // 카테고리 삭제
        categoryRepository.deleteById(id);
    }

    public List<Category> getCustomCategories() {
        return categoryRepository.findByType("custom");
    }
}

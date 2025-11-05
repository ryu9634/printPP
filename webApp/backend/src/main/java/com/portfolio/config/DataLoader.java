package com.portfolio.config;

import com.portfolio.model.Category;
import com.portfolio.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataLoader implements CommandLineRunner {

    private final CategoryRepository categoryRepository;

    @Override
    public void run(String... args) throws Exception {
        // 기본 카테고리가 없으면 생성
        if (categoryRepository.count() == 0) {
            Category main = new Category();
            main.setId("main");
            main.setName("Main");
            main.setType("default");
            categoryRepository.save(main);

            Category artwork = new Category();
            artwork.setId("artwork");
            artwork.setName("Art work");
            artwork.setType("default");
            categoryRepository.save(artwork);

            Category cv = new Category();
            cv.setId("cv");
            cv.setName("CV");
            cv.setType("default");
            categoryRepository.save(cv);

            System.out.println("기본 카테고리가 생성되었습니다.");
        }
    }
}

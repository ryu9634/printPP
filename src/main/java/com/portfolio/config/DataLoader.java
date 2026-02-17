package com.portfolio.config;

import com.portfolio.model.Category;
import com.portfolio.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataLoader implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataLoader.class);

    private final CategoryRepository categoryRepository;

    @Override
    public void run(String... args) throws Exception {
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

            log.info("기본 카테고리가 생성되었습니다.");
        }
    }
}

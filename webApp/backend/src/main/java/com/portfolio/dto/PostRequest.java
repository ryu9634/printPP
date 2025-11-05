package com.portfolio.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class PostRequest {

    @NotBlank(message = "카테고리 ID는 필수입니다")
    private String categoryId;

    @NotBlank(message = "제목은 필수입니다")
    private String title;

    @NotBlank(message = "연도는 필수입니다")
    private String year;

    @NotBlank(message = "매체는 필수입니다")
    private String medium;

    @NotBlank(message = "크기는 필수입니다")
    private String size;

    private String thumbnail;

    private String description;

    private List<String> images = new ArrayList<>();
}

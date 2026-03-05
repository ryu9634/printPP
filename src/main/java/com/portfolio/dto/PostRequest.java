package com.portfolio.dto;

import com.portfolio.model.PostImage;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Pattern;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class PostRequest {

    @NotBlank(message = "카테고리 ID는 필수입니다")
    private String categoryId;

    @NotBlank(message = "콘텐츠 타입은 필수입니다")
    @Pattern(regexp = "^(PHOTO|ARTICLE|HTML)$", message = "콘텐츠 타입은 PHOTO, ARTICLE, HTML 중 하나여야 합니다")
    private String contentType;

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

    private String videoUrl;

    private String htmlContent;

    private List<PostImage> images = new ArrayList<>();

    private Integer displayOrder;
}

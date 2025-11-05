package com.portfolio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CategoryRequest {

    @NotBlank(message = "카테고리 ID는 필수입니다")
    @Pattern(regexp = "^[a-z0-9-]+$", message = "카테고리 ID는 소문자, 숫자, 하이픈만 사용 가능합니다")
    private String id;

    @NotBlank(message = "카테고리 이름은 필수입니다")
    private String name;

    private String type = "custom";
}

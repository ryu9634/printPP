package com.portfolio.model;

import javax.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "posts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String categoryId;

    @Column(nullable = false)
    private String contentType; // "PHOTO", "ARTICLE", "HTML"

    @Column(nullable = false)
    private String title;

    @Column(name = "post_year", nullable = false)
    private String year;

    @Column(nullable = false)
    private String medium;

    @Column(nullable = false)
    private String size;

    private String thumbnail;

    @Column(length = 10000)
    private String description; // ARTICLE일 때 Quill JSON 저장

    @Column(length = 10000, name = "html_content")
    private String htmlContent; // HTML 타입일 때 사용

    @ElementCollection
    @CollectionTable(name = "post_images", joinColumns = @JoinColumn(name = "post_id"))
    @Column(name = "image_url")
    private List<String> images = new ArrayList<>();

    @Column(name = "created_at")
    private Long createdAt;

    @Column(name = "updated_at")
    private Long updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = System.currentTimeMillis();
        updatedAt = System.currentTimeMillis();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = System.currentTimeMillis();
    }
}

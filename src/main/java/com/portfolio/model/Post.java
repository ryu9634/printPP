package com.portfolio.model;

import javax.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "posts", indexes = {
    @Index(name = "idx_post_category", columnList = "categoryId"),
    @Index(name = "idx_post_category_order", columnList = "categoryId, display_order"),
    @Index(name = "idx_post_content_type", columnList = "contentType")
})
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
    private String contentType;

    @Column(nullable = false)
    private String title;

    @Column(name = "post_year", nullable = false)
    private String year;

    @Column(nullable = false)
    private String medium;

    @Column(nullable = false)
    private String size;

    private String thumbnail;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "video_url")
    private String videoUrl;

    @Column(columnDefinition = "TEXT", name = "html_content")
    private String htmlContent;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "post_images", joinColumns = @JoinColumn(name = "post_id"))
    private List<PostImage> images = new ArrayList<>();

    @Column(name = "display_order")
    private Integer displayOrder = 0;

    @Version
    private Long version;

    @Column(name = "created_at")
    private Long createdAt;

    @Column(name = "updated_at")
    private Long updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = System.currentTimeMillis();
        updatedAt = System.currentTimeMillis();
        if (displayOrder == null) {
            displayOrder = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = System.currentTimeMillis();
    }
}

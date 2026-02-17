package com.portfolio.model;

import javax.persistence.Column;
import javax.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostImage {

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "image_description", columnDefinition = "TEXT")
    private String imageDescription;
}

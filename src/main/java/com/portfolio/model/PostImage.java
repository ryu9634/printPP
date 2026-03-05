package com.portfolio.model;

import javax.persistence.Column;
import javax.persistence.Embeddable;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
public class PostImage {

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "image_description", columnDefinition = "TEXT")
    private String imageDescription;

    @Column(name = "display_order")
    private Integer displayOrder = 0;

    @Column(name = "media_type")
    private String mediaType = "IMAGE";

    @Column(name = "show_description")
    private Boolean showDescription = true;

    @Column(name = "show_image_description")
    private Boolean showImageDescription = false;

    @Column(name = "description_position")
    private String descriptionPosition = "right";
}

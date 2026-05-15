package com.example.testspring.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MenuItemDTO {
    private Long id;
    private Long restaurantId;
    private String name;
    private String description;
    private Long price;
    private Long oldPrice;
    private String category;
    private Boolean popular;
    private String imageUrl;
}
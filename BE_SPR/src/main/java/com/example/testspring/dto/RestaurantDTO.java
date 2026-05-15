package com.example.testspring.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RestaurantDTO {
    private Long id;
    private String name;
    private String address;
    private Double rating;
    private String status;
    private String category;
    private String deliveryTime;
    private Integer discount;
    private String imageUrl;
}
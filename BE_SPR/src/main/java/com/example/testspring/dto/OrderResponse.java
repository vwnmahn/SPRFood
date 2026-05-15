package com.example.testspring.dto;

import com.example.testspring.entity.OrderStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class OrderResponse {
    private Long id;
    private String orderCode;
    private String restaurantName;
    private String restaurantImage;
    private String deliveryAddress;
    private String phone;
    private String note;
    private Long totalAmount;
    private OrderStatus status;
    private String cancelReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<OrderItemResponseDTO> items;
    private String customerName;
    private String customerUsername;
    @Data
    @Builder
    public static class OrderItemResponseDTO {
        private String name;
        private Integer quantity;
        private Long price;
        private String image;
    }
}
package com.example.testspring.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StatisticsDTO {
    private long totalOrders;
    private long totalUsers;
    private long totalRestaurants;
    private long pendingOrders;
    private long confirmedOrders;
    private long deliveringOrders;
    private long completedOrders;
    private long cancelledOrders;
    private double totalRevenue;
}
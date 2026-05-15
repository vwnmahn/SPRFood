package com.example.testspring.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;


@Getter
@AllArgsConstructor
public enum OrderStatus {
    PENDING("Chờ xác nhận"),
    CONFIRMED("Đã xác nhận"),
    DELIVERING("Đang giao"),
    COMPLETED("Hoàn thành"),
    CANCELLED("Đã hủy");
    private final String description;
}
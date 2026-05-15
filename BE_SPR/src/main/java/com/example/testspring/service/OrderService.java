package com.example.testspring.service;

import com.example.testspring.dto.OrderRequest;
import com.example.testspring.dto.OrderResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
public interface OrderService {
    OrderResponse createOrder(OrderRequest request, Long accountId);
    List<OrderResponse> getUserOrders(Long accountId);
    Page<OrderResponse> getUserOrders(Long accountId, Pageable pageable);
    OrderResponse cancelOrder(Long orderId, String reason, Long accountId);
    OrderResponse updateOrderStatus(Long orderId, String status);
    List<OrderResponse> getOrdersByStatus(Long accountId, String status);
    OrderResponse getOrderById(Long orderId);
    List<OrderResponse> getAllOrders();
}
package com.example.testspring.service.impl;

import com.example.testspring.controller.NotificationController;
import com.example.testspring.dto.OrderItemDTO;
import com.example.testspring.dto.OrderRequest;
import com.example.testspring.dto.OrderResponse;
import com.example.testspring.entity.Account;
import com.example.testspring.entity.Order;
import com.example.testspring.entity.OrderItem;
import com.example.testspring.entity.OrderStatus;
import com.example.testspring.exception.AppException;
import com.example.testspring.exception.ErrorCode;
import com.example.testspring.mapper.OrderMapper;
import com.example.testspring.repository.AccountRepository;
import com.example.testspring.repository.OrderRepository;
import com.example.testspring.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final AccountRepository accountRepository;
    private final OrderMapper orderMapper;
    private final NotificationController notificationController;
    @Override
    @Transactional
    public OrderResponse createOrder(OrderRequest request, Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String orderCode = generateOrderCode();

        Order order = orderMapper.toEntity(request);
        order.setOrderCode(orderCode);
        order.setAccount(account);
        order.setTotalAmount(orderMapper.calculateTotalAmount(request.getItems()));
        order.setStatus(OrderStatus.PENDING);
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        for (OrderItemDTO itemDTO : request.getItems()) {
            OrderItem item = orderMapper.toEntity(itemDTO);
            order.addItem(item);
        }

        Order savedOrder = orderRepository.save(order);
        log.info("Đơn hàng mới được tạo: {} bởi accountId: {}", orderCode, accountId);
        notificationController.notifyNewOrder(orderMapper.toResponseDTO(savedOrder));
        return orderMapper.toResponseDTO(savedOrder);
    }
    @Override
    public List<OrderResponse> getAllOrders() {
        List<Order> orders = orderRepository.findAllWithAccount();
        return orderMapper.toResponseDTOList(orders);
    }
    @Override
    public List<OrderResponse> getUserOrders(Long accountId) {
        try {
            Account account = accountRepository.findById(accountId)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            List<Order> orders = orderRepository.findByAccountOrderByCreatedAtDesc(account);
            return orderMapper.toResponseDTOList(orders);
        } catch (Exception e) {
            log.error("Error in getUserOrders: {}", e.getMessage(),e);
            return Collections.emptyList();
        }
    }

    @Override
    public Page<OrderResponse> getUserOrders(Long accountId, Pageable pageable) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // ✅ Dùng query có JOIN FETCH cho phân trang
        Page<Order> orders = orderRepository.findByAccountWithItems(account, pageable);
        return orders.map(orderMapper::toResponseDTO);
    }

    @Override
    public OrderResponse getOrderById(Long orderId) {
        // ✅ QUAN TRỌNG: Dùng query JOIN FETCH để lấy items trong 1 query duy nhất
        Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với ID: " + orderId));
        return orderMapper.toResponseDTO(order);
    }

    @Override
    @Transactional
    public OrderResponse cancelOrder(Long orderId, String reason, Long accountId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (!order.getAccount().getId().equals(accountId)) {
            throw new RuntimeException("Bạn không có quyền hủy đơn hàng này");
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new RuntimeException("Không thể hủy đơn hàng đang ở trạng thái: " + order.getStatus().getDescription());
        }

        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelReason(reason);
        order.setUpdatedAt(LocalDateTime.now());

        Order cancelledOrder = orderRepository.save(order);
        log.info("Đơn hàng {} đã được hủy bởi accountId: {}", order.getOrderCode(), accountId);
        notificationController.notifyOrderCancelled(orderMapper.toResponseDTO(cancelledOrder));
        return orderMapper.toResponseDTO(cancelledOrder);
    }

    @Override
    public List<OrderResponse> getOrdersByStatus(Long accountId, String status) {
        // Nếu accountId null hoặc 0 -> admin đang xem tất cả orders theo status
        if (accountId == null || accountId == 0) {
            OrderStatus orderStatus;
            try {
                orderStatus = OrderStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Trạng thái không hợp lệ: " + status);
            }
            // Admin lấy tất cả orders theo status
            List<Order> orders = orderRepository.findByStatusWithAccount(orderStatus);
            return orderMapper.toResponseDTOList(orders);
        }

        // User thường lấy orders của riêng mình
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        OrderStatus orderStatus;
        try {
            orderStatus = OrderStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Trạng thái không hợp lệ: " + status);
        }
        List<Order> orders = orderRepository.findByAccountAndStatus(account, orderStatus);
        return orderMapper.toResponseDTOList(orders);
    }

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, String status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với ID: " + orderId));

        OrderStatus newStatus;
        try {
            newStatus = OrderStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Trạng thái không hợp lệ: " + status);
        }

        order.setStatus(newStatus);
        order.setUpdatedAt(LocalDateTime.now());

        Order updatedOrder = orderRepository.save(order);
        log.info("Đơn hàng {} đã cập nhật trạng thái thành: {}", order.getOrderCode(), newStatus.getDescription());

        notificationController.notifyOrderUpdated(orderMapper.toResponseDTO(updatedOrder));
        return orderMapper.toResponseDTO(updatedOrder);
    }

    // ========== Helper Methods ==========
    private String generateOrderCode() {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
        String timestamp = java.time.LocalDateTime.now().format(formatter);
        String random = String.valueOf(System.currentTimeMillis() % 1000);
        return "SPR" + timestamp + random;
    }
}
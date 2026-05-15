package com.example.testspring.controller;

import com.example.testspring.dto.OrderRequest;
import com.example.testspring.dto.OrderResponse;
import com.example.testspring.security.CustomUserDetails;
import com.example.testspring.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Slf4j
public class OrderController {

    private final OrderService orderService;

    private Long getCurrentAccountId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Người dùng chưa đăng nhập");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof CustomUserDetails userDetails) {
            return userDetails.getAccount().getId();
        }
        log.error("Invalid principal type: {}", principal);
        throw new RuntimeException("Không thể xác định người dùng");
    }

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody OrderRequest request) {
        Long accountId = getCurrentAccountId();
        log.info("Tạo đơn hàng mới cho accountId: {}", accountId);

        OrderResponse response = orderService.createOrder(request, accountId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getOrderById(@PathVariable Long orderId) {
        log.info("Lấy chi tiết đơn hàng: {}", orderId);

        OrderResponse response = orderService.getOrderById(orderId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getUserOrders() {
        Long accountId = getCurrentAccountId();
        log.info("Lấy tất cả đơn hàng của accountId: {}", accountId);

        List<OrderResponse> orders = orderService.getUserOrders(accountId);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/page")
    public ResponseEntity<Page<OrderResponse>> getUserOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Long accountId = getCurrentAccountId();
        Sort.Direction sortDirection = direction.equalsIgnoreCase("asc")
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sortBy));

        log.info("Lấy đơn hàng phân trang của accountId: {}, page: {}, size: {}", accountId, page, size);

        Page<OrderResponse> orders = orderService.getUserOrders(accountId, pageable);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<OrderResponse>> getOrdersByStatus(@PathVariable String status) {
        Long accountId = getCurrentAccountId();
        log.info("Lọc đơn hàng theo status: {} của accountId: {}", status, accountId);

        List<OrderResponse> orders = orderService.getOrdersByStatus(accountId, status);
        return ResponseEntity.ok(orders);
    }

    @PutMapping("/{orderId}/cancel")
    public ResponseEntity<OrderResponse> cancelOrder(
            @PathVariable Long orderId,
            @RequestBody(required = false) Map<String, String> body) {

        Long accountId = getCurrentAccountId();
        String reason = body != null ? body.get("reason") : null;

        log.info("Hủy đơn hàng: {} bởi accountId: {}, lý do: {}", orderId, accountId, reason);

        OrderResponse response = orderService.cancelOrder(orderId, reason, accountId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{orderId}/status")
    // @PreAuthorize("hasRole('ADMIN')") // Bỏ comment nếu muốn chỉ Admin
    public ResponseEntity<OrderResponse> updateOrderStatus(
            @PathVariable Long orderId,
            @RequestBody Map<String, String> body) {

        String status = body.get("status");
        if (status == null || status.isBlank()) {
            throw new RuntimeException("Trạng thái không được để trống");
        }

        log.info("Cập nhật trạng thái đơn hàng: {} -> {}", orderId, status);

        OrderResponse response = orderService.updateOrderStatus(orderId, status);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Long>> getOrderStatistics() {
        Long accountId = getCurrentAccountId();
        log.info("Lấy thống kê đơn hàng của accountId: {}", accountId);

        Map<String, Long> statistics = new HashMap<>();
        statistics.put("PENDING", (long) orderService.getOrdersByStatus(accountId, "PENDING").size());
        statistics.put("CONFIRMED", (long) orderService.getOrdersByStatus(accountId, "CONFIRMED").size());
        statistics.put("DELIVERING", (long) orderService.getOrdersByStatus(accountId, "DELIVERING").size());
        statistics.put("COMPLETED", (long) orderService.getOrdersByStatus(accountId, "COMPLETED").size());
        statistics.put("CANCELLED", (long) orderService.getOrdersByStatus(accountId, "CANCELLED").size());

        return ResponseEntity.ok(statistics);
    }

    @GetMapping("/test")
    public ResponseEntity<?> testAuth(Authentication authentication,
                                      @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Map<String, Object> result = new HashMap<>();
        result.put("status", "OK");
        result.put("authenticated", authentication != null && authentication.isAuthenticated());
        result.put("accountId", authentication != null ? authentication.getName() : "null");
        result.put("authHeader", authHeader != null ? "Bearer ****" : "null");
        result.put("message", "API đang hoạt động bình thường");
        return ResponseEntity.ok(result);
    }
}
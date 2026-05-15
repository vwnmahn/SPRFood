package com.example.testspring.controller;

import com.example.testspring.dto.AccountDTO;
import com.example.testspring.dto.OrderResponse;
import com.example.testspring.dto.RestaurantDTO;
import com.example.testspring.entity.Account;
import com.example.testspring.entity.Order;
import com.example.testspring.entity.OrderStatus;
import com.example.testspring.entity.Restaurant;
import com.example.testspring.exception.AppException;
import com.example.testspring.exception.ErrorCode;
import com.example.testspring.mapper.AccountMapper;
import com.example.testspring.mapper.RestaurantMapper;
import com.example.testspring.repository.AccountRepository;
import com.example.testspring.repository.OrderRepository;
import com.example.testspring.repository.RestaurantRepository;
import com.example.testspring.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final OrderService orderService;
    private final OrderRepository orderRepository;
    private final AccountRepository accountRepository;
    private final RestaurantRepository restaurantRepository;
    private final AccountMapper accountMapper;
    private final RestaurantMapper restaurantMapper;

    @Value("${upload.dir:uploads/}")
    private String uploadDir;

    // ========== ORDER MANAGEMENT ==========

    @GetMapping("/orders")
    public ResponseEntity<List<OrderResponse>> getAllOrders() {
        log.info("Admin lay tat ca don hang");
        List<OrderResponse> orders = orderService.getAllOrders();
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<OrderResponse> getOrderById(@PathVariable Long orderId) {
        log.info("Admin lay chi tiet don hang: {}", orderId);
        OrderResponse order = orderService.getOrderById(orderId);
        return ResponseEntity.ok(order);
    }

    @PutMapping("/orders/{orderId}/status")
    public ResponseEntity<OrderResponse> updateOrderStatus(
            @PathVariable Long orderId,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        log.info("Admin cap nhat trang thai don hang: {} -> {}", orderId, status);
        OrderResponse order = orderService.updateOrderStatus(orderId, status);
        return ResponseEntity.ok(order);
    }

    @PutMapping("/orders/{orderId}/cancel")
    public ResponseEntity<OrderResponse> cancelOrder(
            @PathVariable Long orderId,
            @RequestBody(required = false) Map<String, String> body) {
        log.info("Admin huy don hang: {}", orderId);
        String reason = body != null ? body.get("reason") : "Admin huy don";
        OrderResponse order = orderService.cancelOrder(orderId, reason, null);
        return ResponseEntity.ok(order);
    }

    // ========== USER MANAGEMENT ==========

    @GetMapping("/users")
    public ResponseEntity<List<AccountDTO>> getAllUsers() {
        log.info("Admin lay tat ca nguoi dung");
        List<Account> accounts = accountRepository.findAll();
        return ResponseEntity.ok(accounts.stream()
                .map(accountMapper::toDTO)
                .collect(Collectors.toList()));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<AccountDTO> getUserById(@PathVariable Long id) {
        log.info("Admin lay nguoi dung: {}", id);
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return ResponseEntity.ok(accountMapper.toDTO(account));
    }

    @PutMapping("/users/{id}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long id) {
        log.info("Admin toggle user status: {}", id);
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        account.setLocked(!account.isLocked());
        accountRepository.save(account);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        log.info("Admin xoa nguoi dung: {}", id);
        accountRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // ========== RESTAURANT MANAGEMENT ==========

    @GetMapping("/restaurants")
    public ResponseEntity<List<RestaurantDTO>> getAllRestaurants() {
        log.info("Admin lay tat ca nha hang");
        List<Restaurant> restaurants = restaurantRepository.findAll();
        return ResponseEntity.ok(restaurants.stream()
                .map(restaurantMapper::toDTO)
                .collect(Collectors.toList()));
    }

    @GetMapping("/restaurants/{id}")
    public ResponseEntity<RestaurantDTO> getRestaurantById(@PathVariable Long id) {
        log.info("Admin lay nha hang: {}", id);
        Restaurant restaurant = restaurantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Restaurant not found"));
        return ResponseEntity.ok(restaurantMapper.toDTO(restaurant));
    }

    @PostMapping("/restaurants")
    public ResponseEntity<RestaurantDTO> addRestaurant(@RequestBody RestaurantDTO restaurantDTO) {
        log.info("Admin them nha hang: {}", restaurantDTO.getName());
        Restaurant restaurant = restaurantMapper.toEntity(restaurantDTO);
        restaurant.setStatus("ACTIVE");
        Restaurant saved = restaurantRepository.save(restaurant);
        return ResponseEntity.ok(restaurantMapper.toDTO(saved));
    }

    @PutMapping("/restaurants/{id}")
    public ResponseEntity<RestaurantDTO> updateRestaurant(
            @PathVariable Long id,
            @RequestBody RestaurantDTO restaurantDTO) {
        log.info("Admin cap nhat nha hang: {}", id);
        Restaurant restaurant = restaurantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Restaurant not found"));
        restaurantMapper.updateEntity(restaurantDTO, restaurant);

        // Cap nhat anh neu co
        if (restaurantDTO.getImageUrl() != null) {
            restaurant.setImageUrl(restaurantDTO.getImageUrl());
        }

        Restaurant saved = restaurantRepository.save(restaurant);
        return ResponseEntity.ok(restaurantMapper.toDTO(saved));
    }

    @DeleteMapping("/restaurants/{id}")
    public ResponseEntity<?> deleteRestaurant(@PathVariable Long id) {
        log.info("Admin xoa nha hang: {}", id);
        restaurantRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/restaurants/{id}/status")
    public ResponseEntity<RestaurantDTO> updateRestaurantStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        log.info("Admin cap nhat trang thai nha hang: {} -> {}", id, status);

        Restaurant restaurant = restaurantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Restaurant not found"));
        restaurant.setStatus(status);
        Restaurant saved = restaurantRepository.save(restaurant);

        return ResponseEntity.ok(restaurantMapper.toDTO(saved));
    }

    // ========== STATISTICS ==========

    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getStatistics() {
        log.info("Admin lay thong ke");

        long totalOrders = orderRepository.count();
        long totalUsers = accountRepository.count();
        long totalRestaurants = restaurantRepository.count();

        long pendingOrders = orderRepository.countByStatus(OrderStatus.PENDING);
        long confirmedOrders = orderRepository.countByStatus(OrderStatus.CONFIRMED);
        long deliveringOrders = orderRepository.countByStatus(OrderStatus.DELIVERING);
        long completedOrders = orderRepository.countByStatus(OrderStatus.COMPLETED);
        long cancelledOrders = orderRepository.countByStatus(OrderStatus.CANCELLED);

        double totalRevenue = orderRepository.findAll().stream()
                .filter(o -> o.getStatus() == OrderStatus.COMPLETED)
                .mapToDouble(Order::getTotalAmount)
                .sum();

        Map<String, Object> statistics = Map.of(
                "totalOrders", totalOrders,
                "totalUsers", totalUsers,
                "totalRestaurants", totalRestaurants,
                "pendingOrders", pendingOrders,
                "confirmedOrders", confirmedOrders,
                "deliveringOrders", deliveringOrders,
                "completedOrders", completedOrders,
                "cancelledOrders", cancelledOrders,
                "totalRevenue", totalRevenue
        );
        return ResponseEntity.ok(statistics);
    }

    // ========== UPLOAD IMAGE ==========

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "type", defaultValue = "restaurant") String type) {
        try {
            log.info("Upload anh: type={}, fileName={}", type, file.getOriginalFilename());

            // Kiem tra file rong
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "File khong hop le"));
            }

            // Lay ten file goc
            String originalFileName = file.getOriginalFilename();
            String extension = "";
            if (originalFileName != null && originalFileName.contains(".")) {
                extension = originalFileName.substring(originalFileName.lastIndexOf("."));
            } else {
                extension = ".jpg";
            }

            // Tao ten file duy nhat
            String fileName = UUID.randomUUID().toString() + extension;

            // Duong dan luu file
            String fullUploadDir = uploadDir + type + "/";
            File dir = new File(fullUploadDir);
            if (!dir.exists()) {
                boolean created = dir.mkdirs();
                if (!created) {
                    log.error("Khong the tao thu muc: {}", fullUploadDir);
                    return ResponseEntity.status(500).body(Map.of("error", "Khong the tao thu muc upload"));
                }
            }

            // Luu file
            Path filePath = Paths.get(fullUploadDir + fileName);
            Files.write(filePath, file.getBytes());

            // URL truy cap
            String imageUrl = "/uploads/" + type + "/" + fileName;

            Map<String, String> response = new HashMap<>();
            response.put("imageUrl", imageUrl);
            response.put("message", "Upload thanh cong!");

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            log.error("Upload anh that bai: {}", e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Upload that bai: " + e.getMessage()));
        }
    }
}
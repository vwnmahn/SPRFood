package com.example.testspring.controller;

import com.example.testspring.dto.RestaurantDTO;
import com.example.testspring.entity.Restaurant;
import com.example.testspring.mapper.RestaurantMapper;
import com.example.testspring.repository.RestaurantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/restaurants")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RestaurantController {

    private final RestaurantRepository restaurantRepository;
    private final RestaurantMapper restaurantMapper;

    // ✅ API lấy danh sách tất cả nhà hàng (đã có)
    @GetMapping
    public ResponseEntity<List<RestaurantDTO>> getAllRestaurants() {
        List<Restaurant> restaurants = restaurantRepository.findAll();
        List<RestaurantDTO> result = restaurants.stream()
                .map(restaurantMapper::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ✅ THÊM API NÀY - Lấy thông tin chi tiết 1 nhà hàng theo ID
    @GetMapping("/{id}")
    public ResponseEntity<RestaurantDTO> getRestaurantById(@PathVariable Long id) {
        Restaurant restaurant = restaurantRepository.findById(id).orElse(null);
        if (restaurant == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(restaurantMapper.toDTO(restaurant));
    }

    // ✅ THÊM API NÀY - Lấy danh sách nhà hàng đang hoạt động
    @GetMapping("/active")
    public ResponseEntity<List<RestaurantDTO>> getActiveRestaurants() {
        List<Restaurant> restaurants = restaurantRepository.findByStatus("ACTIVE");
        List<RestaurantDTO> result = restaurants.stream()
                .map(restaurantMapper::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }
}
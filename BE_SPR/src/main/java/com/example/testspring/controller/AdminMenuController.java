package com.example.testspring.controller;

import com.example.testspring.dto.MenuItemDTO;
import com.example.testspring.entity.MenuItem;
import com.example.testspring.entity.Restaurant;
import com.example.testspring.mapper.MenuItemMapper;
import com.example.testspring.repository.MenuItemRepository;
import com.example.testspring.repository.RestaurantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/restaurants/{restaurantId}/menu")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Slf4j
public class AdminMenuController {

    private final MenuItemRepository menuItemRepository;
    private final RestaurantRepository restaurantRepository;
    private final MenuItemMapper menuItemMapper;

    // Lấy tất cả món của nhà hàng
    @GetMapping
    public ResponseEntity<List<MenuItemDTO>> getMenuItems(@PathVariable Long restaurantId) {
        log.info("Admin lấy menu của nhà hàng: {}", restaurantId);
        List<MenuItem> items = menuItemRepository.findByRestaurantId(restaurantId);
        List<MenuItemDTO> result = items.stream()
                .map(menuItemMapper::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // Thêm món mới
    @PostMapping
    public ResponseEntity<MenuItemDTO> addMenuItem(
            @PathVariable Long restaurantId,
            @RequestBody MenuItemDTO dto) {
        log.info("Admin thêm món cho nhà hàng: {}", restaurantId);

        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new RuntimeException("Restaurant not found"));

        MenuItem item = menuItemMapper.toEntity(dto);
        item.setRestaurant(restaurant);
        MenuItem saved = menuItemRepository.save(item);

        return ResponseEntity.ok(menuItemMapper.toDTO(saved));
    }

    // Cập nhật món
    @PutMapping("/{itemId}")
    public ResponseEntity<MenuItemDTO> updateMenuItem(
            @PathVariable Long restaurantId,
            @PathVariable Long itemId,
            @RequestBody MenuItemDTO dto) {
        log.info("Admin cập nhật món {} của nhà hàng: {}", itemId, restaurantId);

        MenuItem item = menuItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Menu item not found"));

        menuItemMapper.updateEntity(dto, item);
        MenuItem saved = menuItemRepository.save(item);

        return ResponseEntity.ok(menuItemMapper.toDTO(saved));
    }

    // Xóa món
    @DeleteMapping("/{itemId}")
    public ResponseEntity<?> deleteMenuItem(
            @PathVariable Long restaurantId,
            @PathVariable Long itemId) {
        log.info("Admin xóa món {} của nhà hàng: {}", itemId, restaurantId);
        menuItemRepository.deleteById(itemId);
        return ResponseEntity.ok().build();
    }
}
package com.example.testspring.controller;

import com.example.testspring.dto.MenuItemDTO;
import com.example.testspring.repository.MenuItemRepository;
import com.example.testspring.mapper.MenuItemMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/restaurants/{restaurantId}/menu")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MenuController {

    private final MenuItemRepository menuItemRepository;
    private final MenuItemMapper menuItemMapper;

    @GetMapping
    public ResponseEntity<List<MenuItemDTO>> getMenuByRestaurant(@PathVariable Long restaurantId) {
        List<MenuItemDTO> items = menuItemRepository.findByRestaurantId(restaurantId)
                .stream()
                .map(menuItemMapper::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(items);
    }
}
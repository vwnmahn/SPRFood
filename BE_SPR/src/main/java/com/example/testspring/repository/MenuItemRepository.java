package com.example.testspring.repository;

import com.example.testspring.entity.MenuItem;
import com.example.testspring.entity.Restaurant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {

    // Các method cơ bản
    List<MenuItem> findByRestaurant(Restaurant restaurant);
    List<MenuItem> findByRestaurantId(Long restaurantId);
    List<MenuItem> findByRestaurantAndCategory(Restaurant restaurant, String category);

    // Lọc theo category
    List<MenuItem> findByRestaurantIdAndCategory(Long restaurantId, String category);

    // Lấy món phổ biến
    List<MenuItem> findByRestaurantIdAndPopularTrue(Long restaurantId);

    // Tìm kiếm theo tên
    List<MenuItem> findByRestaurantIdAndNameContaining(Long restaurantId, String keyword);

    // Phân trang
    Page<MenuItem> findByRestaurantId(Long restaurantId, Pageable pageable);

    // Đếm số lượng
    long countByRestaurantId(Long restaurantId);

    // Xóa theo restaurant
    void deleteByRestaurantId(Long restaurantId);

    // Tìm theo khoảng giá
    List<MenuItem> findByRestaurantIdAndPriceBetween(Long restaurantId, Long minPrice, Long maxPrice);
}
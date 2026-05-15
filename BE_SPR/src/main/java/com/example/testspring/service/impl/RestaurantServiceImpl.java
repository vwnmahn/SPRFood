package com.example.testspring.service.impl;

import com.example.testspring.entity.Restaurant;
import com.example.testspring.repository.RestaurantRepository;
import com.example.testspring.service.RestaurantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class RestaurantServiceImpl implements RestaurantService {

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Override
    public List<Restaurant> getAllRestaurants() {
        return restaurantRepository.findAll();
    }

    @Override
    public Restaurant getRestaurantById(Long id) {
        Optional<Restaurant> restaurant = restaurantRepository.findById(id);
        return restaurant.orElse(null);
    }

    @Override
    public List<Restaurant> getActiveRestaurants() {
        return restaurantRepository.findByStatus("ACTIVE");
    }

    @Override
    public Restaurant createRestaurant(Restaurant restaurant) {
        restaurant.setStatus("ACTIVE");
        return restaurantRepository.save(restaurant);
    }

    @Override
    public Restaurant updateRestaurant(Long id, Restaurant restaurantDetails) {
        Restaurant restaurant = getRestaurantById(id);
        if (restaurant != null) {
            restaurant.setName(restaurantDetails.getName());
            restaurant.setAddress(restaurantDetails.getAddress());
            restaurant.setRating(restaurantDetails.getRating());
            restaurant.setDeliveryTime(restaurantDetails.getDeliveryTime());
            restaurant.setDiscount(restaurantDetails.getDiscount());
            restaurant.setCategory(restaurantDetails.getCategory());
            // Không thay đổi status nếu không truyền
            if (restaurantDetails.getStatus() != null) {
                restaurant.setStatus(restaurantDetails.getStatus());
            }
            return restaurantRepository.save(restaurant);
        }
        return null;
    }

    @Override
    public boolean deleteRestaurant(Long id) {
        Restaurant restaurant = getRestaurantById(id);
        if (restaurant != null) {
            // Soft delete - chỉ đổi status thành INACTIVE
            restaurant.setStatus("INACTIVE");
            restaurantRepository.save(restaurant);
            return true;
        }
        return false;
    }
}
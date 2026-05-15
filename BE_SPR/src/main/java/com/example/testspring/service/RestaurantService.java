package com.example.testspring.service;

import com.example.testspring.entity.Restaurant;
import java.util.List;

public interface RestaurantService {
    List<Restaurant> getAllRestaurants();
    Restaurant getRestaurantById(Long id);
    List<Restaurant> getActiveRestaurants();
    Restaurant createRestaurant(Restaurant restaurant);
    Restaurant updateRestaurant(Long id, Restaurant restaurantDetails);
    boolean deleteRestaurant(Long id);
}
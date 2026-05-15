package com.example.testspring.mapper;

import com.example.testspring.dto.RestaurantDTO;
import com.example.testspring.entity.Restaurant;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface RestaurantMapper {
    @Mapping(target = "imageUrl", source = "imageUrl")
    Restaurant toEntity(RestaurantDTO dto);
    @Mapping(target = "imageUrl", source = "imageUrl")
    RestaurantDTO toDTO(Restaurant entity);
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "imageUrl", source = "imageUrl")
    @Mapping(target = "category", source = "category")
    void updateEntity(RestaurantDTO dto, @MappingTarget Restaurant entity);
}
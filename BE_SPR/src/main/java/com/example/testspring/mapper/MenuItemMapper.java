package com.example.testspring.mapper;

import com.example.testspring.dto.MenuItemDTO;
import com.example.testspring.entity.MenuItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface MenuItemMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "restaurant", ignore = true)
    @Mapping(target = "imageUrl", source = "imageUrl")
    MenuItem toEntity(MenuItemDTO dto);

    @Mapping(source = "restaurant.id", target = "restaurantId")
    MenuItemDTO toDTO(MenuItem entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "restaurant", ignore = true)
    @Mapping(target = "imageUrl", source = "imageUrl")
    void updateEntity(MenuItemDTO dto, @MappingTarget MenuItem entity);
}
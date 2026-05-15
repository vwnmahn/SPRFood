package com.example.testspring.mapper;

import com.example.testspring.dto.OrderItemDTO;
import com.example.testspring.dto.OrderRequest;
import com.example.testspring.dto.OrderResponse;
import com.example.testspring.entity.Order;
import com.example.testspring.entity.OrderItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.List;

@Mapper(componentModel = "spring")
public interface OrderMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "orderCode", ignore = true)
    @Mapping(target = "account", ignore = true)
    @Mapping(target = "totalAmount", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "cancelReason", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "items", ignore = true)
    Order toEntity(OrderRequest requestDTO);

    // MapStruct tự động mapping createdAt, updatedAt (cùng kiểu LocalDateTime)
    @Mapping(target = "items", source = "items", qualifiedByName = "mapOrderItemsToResponse")
    @Mapping(target = "customerName", expression = "java(order.getAccount().getFirstName() + \" \" + order.getAccount().getLastName())")
    @Mapping(target = "customerUsername", source = "account.username")
    OrderResponse toResponseDTO(Order order);

    List<OrderResponse> toResponseDTOList(List<Order> orders);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "order", ignore = true)
    @Mapping(target = "itemName", source = "name")
    OrderItem toEntity(OrderItemDTO itemDTO);

    @Mapping(target = "name", source = "itemName")
    OrderItemDTO toDTO(OrderItem orderItem);

    @Named("mapOrderItemsToResponse")
    default List<OrderResponse.OrderItemResponseDTO> mapOrderItemsToResponse(List<OrderItem> items) {
        if (items == null) return List.of();
        return items.stream()
                .map(item -> OrderResponse.OrderItemResponseDTO.builder()
                        .name(item.getItemName())
                        .quantity(item.getQuantity())
                        .price(item.getPrice())
                        .image(item.getItemImage())
                        .build())
                .toList();
    }

    @Named("calculateTotalAmount")
    default Long calculateTotalAmount(List<OrderItemDTO> items) {
        if (items == null) return 0L;
        return items.stream()
                .mapToLong(item -> item.getPrice() * item.getQuantity())
                .sum();
    }
}
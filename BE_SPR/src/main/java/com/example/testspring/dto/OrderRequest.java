package com.example.testspring.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.util.List;

@Data
public class OrderRequest {
    @NotBlank(message = "Tên nhà hàng không được để trống")
    private String restaurantName;

    private String restaurantImage;

    @NotBlank(message = "Địa chỉ giao hàng không được để trống")
    private String deliveryAddress;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "(84|0[3|5|7|8|9])+([0-9]{8})", message = "Số điện thoại không hợp lệ")
    private String phone;

    private String note;

    @NotEmpty(message = "Giỏ hàng không được trống")
    @Valid
    private List<OrderItemDTO> items;
}

package com.example.testspring.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class RegisterRequest {
    @NotBlank(message = "User Name không được trống !")
    private String username;
    @NotBlank(message = "First Name không để trống !")
    private String firstName;
    @NotBlank(message = "Last Name không để trống !")
    private String lastName;
    @Email
    @NotBlank(message = "Email không để trống")
    private String email;
    @NotBlank
    @Pattern(
            regexp = "^(0|\\+84)(3|5|7|8|9)[0-9]{8}$",
            message = "Số điện thoại không hợp lệ"
    )
    private String phoneNumber;
    @NotBlank(message = "Address không để trống! ")
    private String address;
    @NotBlank
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
            message = "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt"
    )
    private String password;
    @NotBlank(message = "Vui lòng xác nhận lại PassWord")
    private String confirmPassword;
}

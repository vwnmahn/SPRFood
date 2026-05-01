package com.example.testspring.controller;

import com.example.testspring.dto.*;
import com.example.testspring.service.AuthService;
import com.example.testspring.service.PassWordService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final PassWordService passwordService;
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@RequestBody @Valid RegisterRequest registerRequest) {
        AuthResponse result = authService.register(registerRequest);
        return ResponseEntity.ok(
                ApiResponse.<AuthResponse>builder()
                        .code(200)
                        .message("Register success!")
                        .data(result)
                        .build()
        );
    }
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> loginUser(@RequestBody @Valid LoginRequest loginRequest) {
        AuthResponse result = authService.loginUser(loginRequest);
        return ResponseEntity.ok(
                ApiResponse.<AuthResponse>builder()
                        .code(200)
                        .message("Login success!")
                        .data(result)
                        .build()
        );
    }
    @PostMapping("/login/admin")
    public ResponseEntity<ApiResponse<AuthResponse>> loginAdmin(@RequestBody @Valid LoginRequest loginRequest) {
        AuthResponse result = authService.loginAdmin(loginRequest);
        return ResponseEntity.ok(
                ApiResponse.<AuthResponse>builder()
                        .code(200)
                        .message("Login success!")
                        .data(result)
                        .build()
        );
    }
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<?>> logout(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7); // remove "Bearer "
        authService.logout(token);
        return ResponseEntity.ok(
                ApiResponse.builder()
                        .code(200)
                        .message("Logout success !")
                        .build()
        );
    }
    @GetMapping("/users/online")
    public ResponseEntity<ApiResponse<List<AccountDTO>>> getOnlineUsers() {
        List<AccountDTO> onlineUsers = authService.getOnlineUsers();
        return ResponseEntity.ok(
                ApiResponse.<List<AccountDTO>>builder()
                        .code(200)
                        .message("Get Users Online success!")
                        .data(onlineUsers)
                        .build()
        );
    }
    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<AuthResponse>> updateUser(@PathVariable @Positive Long id, @RequestBody @Valid AccountUpdate accountUpdate) {
        AuthResponse result = authService.updateInfo(id, accountUpdate);
        return ResponseEntity.ok(
                ApiResponse.<AuthResponse>builder()
                        .code(200)
                        .message("Update success!")
                        .data(result)
                        .build()
        );
    }
    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<?>> deleteUser(@RequestHeader("Authorization") String token) {
        authService.deleteMyAccount(token);
        return ResponseEntity.ok(
                ApiResponse.builder()
                        .code(200)
                        .message("Deleted success!")
                        .build()
        );
    }
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<?>> forgotPassword(
            @RequestBody ForgotPasswordRequest request
    ){
        passwordService.forgotPassword(request.getIdentifier());
        return ResponseEntity.ok(
                ApiResponse.builder()
                        .code(200)
                        .message("If account exists, reset link has been sent")
                        .build()
        );
    }
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<?>> resetPassword(
            @RequestBody ResetPassWordRequest request) {
        passwordService.resetPassword(request);
        return ResponseEntity.ok(
                ApiResponse.builder()
                        .code(200)
                        .message("Reset password success!")
                        .build()
        );
    }

}

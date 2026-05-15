package com.example.testspring.controller;

import com.example.testspring.dto.*;
import com.example.testspring.exception.AppException;
import com.example.testspring.exception.ErrorCode;
import com.example.testspring.security.JwtUtil;
import com.example.testspring.service.AuthService;
import com.example.testspring.service.PassWordService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final PassWordService passwordService;
    private final JwtUtil jwtUtil;
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
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AccountDTO>> getCurrentUser(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7);
        AccountDTO user = authService.getCurrentUser(token);
        return ResponseEntity.ok(
                ApiResponse.<AccountDTO>builder()
                        .code(200)
                        .message("Get user success!")
                        .data(user)
                        .build()
        );
    }
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<?>> changePassword(
            @RequestBody @Valid ChangePasswordRequest request,
            @RequestHeader("Authorization") String authHeader) {

        String token = authHeader.substring(7);
        Long accountId = jwtUtil.getAccountId(token);

        passwordService.changePassword(request, accountId);
        return ResponseEntity.ok(
                ApiResponse.builder()
                        .code(200)
                        .message("Đổi mật khẩu thành công!")
                        .build()
        );
    }
    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadAvatar(
            @RequestParam("avatar") MultipartFile file,
            @RequestHeader("Authorization") String authHeader) {

        String token = authHeader.substring(7);
        String avatarUrl = authService.uploadAvatar(file, token);

        return ResponseEntity.ok(
                ApiResponse.<Map<String, String>>builder()
                        .code(200)
                        .message("Cập nhật ảnh đại diện thành công!")
                        .data(Map.of("avatarUrl", avatarUrl))
                        .build()
        );
    }

}

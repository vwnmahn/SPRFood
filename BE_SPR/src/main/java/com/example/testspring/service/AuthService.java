package com.example.testspring.service;

import com.example.testspring.dto.*;
import com.example.testspring.entity.RoleName;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface AuthService {
    AuthResponse loginCommon(String identifier, String password, RoleName requiredRole);
    AuthResponse loginUser(LoginRequest loginRequest);
    AuthResponse loginAdmin(LoginRequest loginRequest);
    AuthResponse register(RegisterRequest registerRequest);
    void logout(String refreshToken);
    List<AccountDTO> getOnlineUsers();
    AuthResponse updateInfo(Long id,AccountUpdate accountUpdate);
    void deleteMyAccount(String token);
    RefreshResponse refreshToken(RefreshRequest refreshRequest);
}

package com.example.testspring.service;

import com.example.testspring.dto.AuthResponse;
import com.example.testspring.dto.LoginRequest;
import com.example.testspring.dto.RegisterRequest;
import com.example.testspring.entity.Role;
import org.springframework.stereotype.Service;

@Service
public interface AuthService {
    public AuthResponse loginCommon(String identifier, String password, boolean  isUserLogin);
    public void logout();
    public AuthResponse register(RegisterRequest registerRequest);
    public AuthResponse loginUser(LoginRequest loginRequest);
    public AuthResponse loginAdmin(LoginRequest loginRequest);
}

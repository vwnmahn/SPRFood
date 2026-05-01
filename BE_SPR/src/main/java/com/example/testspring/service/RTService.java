package com.example.testspring.service;

import com.example.testspring.entity.RefreshToken;
import org.springframework.stereotype.Service;

@Service
public interface RTService {
    RefreshToken createRefreshToken(Long accountId);
    RefreshToken verifyToken(String token);
    void revokeToken(String token);
}

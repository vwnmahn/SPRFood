package com.example.testspring.service.impl;

import com.example.testspring.entity.RefreshToken;
import com.example.testspring.exception.AppException;
import com.example.testspring.exception.ErrorCode;
import com.example.testspring.repository.RefreshTokenRepository;
import com.example.testspring.security.JwtUtil;
import com.example.testspring.service.RTService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RTServiceImpl implements RTService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtUtil jwtUtil;
    @Override
    public RefreshToken createRefreshToken(Long accountId) {

        RefreshToken rt = new RefreshToken();
        rt.setAccountId(accountId);
        rt.setToken(UUID.randomUUID().toString());
        rt.setRevoked(false);
        rt.setExpiryDate(LocalDateTime.now().plusSeconds(7 * 24 * 60 * 60));

        return refreshTokenRepository.save(rt);
    }
    @Override
    public RefreshToken verifyToken(String token) {
        if(!jwtUtil.validateToken(token)) {
            throw new AppException(ErrorCode.INVALID_TOKEN);
        }
        // 2. check tồn tại trong DB
        RefreshToken tokenEntity = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new AppException(ErrorCode.TOKEN_NOT_FOUND));
        // 3. check revoked
        if (tokenEntity.isRevoked()) {
            throw new AppException(ErrorCode.TOKEN_REVOKED);
        }
        // 4. check expired (DB level - nếu bạn lưu expiry)
        if (tokenEntity.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new AppException(ErrorCode.TOKEN_EXPIRED);
        }
        return tokenEntity;
    }
    @Override
    public void revokeToken(String token) {

        RefreshToken rt = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new AppException(ErrorCode.TOKEN_NOT_FOUND));
        rt.setRevoked(true);
        refreshTokenRepository.save(rt);
    }
}


package com.example.testspring.service.impl;

import com.example.testspring.security.JwtUtil;
import com.example.testspring.service.ATService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class ATServiceImpl implements ATService {

    private final JwtUtil jwtUtil;

    @Override
    public String generateToken(Long accountId) {
        return jwtUtil.generateToken(accountId, Set.of("USER"));
    }
}


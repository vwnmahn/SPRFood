package com.example.testspring.service;

import org.springframework.stereotype.Service;

@Service
public interface ATService {
    String generateToken(Long accountId);
}

package com.example.testspring.service;

import com.example.testspring.dto.ChangePasswordRequest;
import com.example.testspring.dto.ResetPassWordRequest;
import org.springframework.stereotype.Service;

@Service
public interface PassWordService {
    void forgotPassword(String identifier);
    void resetPassword(ResetPassWordRequest request);
    void changePassword(ChangePasswordRequest request, Long accountId);
}

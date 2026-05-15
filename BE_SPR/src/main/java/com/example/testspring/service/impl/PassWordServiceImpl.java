package com.example.testspring.service.impl;

import com.example.testspring.dto.ChangePasswordRequest;
import com.example.testspring.dto.ResetPassWordRequest;
import com.example.testspring.entity.Account;
import com.example.testspring.entity.PasswordResetToken;
import com.example.testspring.exception.AppException;
import com.example.testspring.exception.ErrorCode;
import com.example.testspring.repository.AccountRepository;
import com.example.testspring.repository.PasswordResetTokenRepository;
import com.example.testspring.service.PassWordService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PassWordServiceImpl implements PassWordService {
    private final AccountRepository accountRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    @Override
    public void forgotPassword(String identifier) {
        Account acc = accountRepository.findByEmail(identifier)
                .or(()->accountRepository.findByPhoneNumber(identifier))
                .orElseThrow(()->new AppException(ErrorCode.USER_NOT_FOUND));
        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setToken(token);
        resetToken.setAccountId(acc.getId());
        resetToken.setExpiryDate(LocalDateTime.now().plusSeconds(15 * 60));
        resetToken.setUsed(false);
        passwordResetTokenRepository.save(resetToken);
        log.info("Reset Token: {}", resetToken.getToken());
    }
    @Override
    public void resetPassword(ResetPassWordRequest request) {
        PasswordResetToken tokenEntity = passwordResetTokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new AppException(ErrorCode.TOKEN_NOT_FOUND));
        // 2. check used
        if (tokenEntity.isUsed()) {
            throw new AppException(ErrorCode.TOKEN_USED);
        }
        // 3. check expired
        if (tokenEntity.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new AppException(ErrorCode.TOKEN_EXPIRED);
        }
        // 4. find account
        Account acc = accountRepository.findById(tokenEntity.getAccountId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        // 5. update password
        acc.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        accountRepository.save(acc);
        // 6. mark token as used
        tokenEntity.setUsed(true);
        passwordResetTokenRepository.save(tokenEntity);
    }

    @Override
    public void changePassword(ChangePasswordRequest request, Long accountId) {
        // 1. Lấy user từ database theo accountId (KHÔNG phải username)
        Account acc = accountRepository.findById(accountId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        // 2. Kiểm tra mật khẩu hiện tại có đúng không
        if (!passwordEncoder.matches(request.getCurrentPassword(), acc.getPasswordHash())) {
            throw new AppException(ErrorCode.INCORRECT_ACCOUNT_OR_PASSWORD);
        }
        // 3. Kiểm tra mật khẩu mới không được trùng với mật khẩu hiện tại
        if (passwordEncoder.matches(request.getNewPassword(), acc.getPasswordHash())) {
            throw new AppException(ErrorCode.PASSWORD_EXISTED);
        }
        // 4. Mã hóa mật khẩu mới
        String encodedNewPassword = passwordEncoder.encode(request.getNewPassword());
        // 5. Cập nhật mật khẩu
        acc.setPasswordHash(encodedNewPassword);
        accountRepository.save(acc);
    }
}

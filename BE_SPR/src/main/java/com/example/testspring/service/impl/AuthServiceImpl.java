package com.example.testspring.service.impl;

import com.example.testspring.dto.*;
import com.example.testspring.entity.Account;
import com.example.testspring.entity.RefreshToken;
import com.example.testspring.entity.Role;
import com.example.testspring.entity.RoleName;
import com.example.testspring.exception.AppException;
import com.example.testspring.exception.ErrorCode;
import com.example.testspring.mapper.AccountMapper;
import com.example.testspring.repository.AccountRepository;
import com.example.testspring.repository.RefreshTokenRepository;
import com.example.testspring.repository.RoleRepository;
import com.example.testspring.security.JwtUtil;
import com.example.testspring.service.ATService;
import com.example.testspring.service.AuthService;
import com.example.testspring.service.RTService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {
    private final PasswordEncoder passwordEncoder;
    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final JwtUtil jwtUtil;
    private final AccountMapper  accountMapper;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ATService atService;
    private final RTService rtService;
    @Override
    public AuthResponse loginCommon(String identifier, String password, RoleName requiredRole) {
        Account account = accountRepository.findByPhoneNumber(identifier)
                .or(() -> accountRepository.findByEmail(identifier))
                .orElseThrow(() -> new AppException(ErrorCode.INCORRECT_ACCOUNT_OR_PASSWORD));
        if (!passwordEncoder.matches(password, account.getPasswordHash())) {
            throw new AppException(ErrorCode.INCORRECT_ACCOUNT_OR_PASSWORD);
        }
        validateEnableOrLocked(account);
        boolean hasRole = account.getRoles().stream()
                .anyMatch(role -> role.getRoleName() == requiredRole);
        if (!hasRole) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        return buildAuthResponse(account);
    }

    public void validateEnableOrLocked(Account account) {
        if (!account.isEnabled()) {
            throw new AppException(ErrorCode.ACCOUNT_DISABLED);
        }
        if (account.isLocked()) {
            throw new AppException(ErrorCode.ACCOUNT_DISABLED);
        }
    }

    @Override
    public AuthResponse loginUser(LoginRequest loginRequest) {
        return loginCommon(loginRequest.getIdentifier(),
                loginRequest.getPassword(),
                RoleName.ROLE_USER);
    }

    @Override
    public AuthResponse loginAdmin(LoginRequest loginRequest) {
        return loginCommon(loginRequest.getIdentifier(),
                loginRequest.getPassword(),
                RoleName.ROLE_ADMIN);
    }

    @Override
    public AuthResponse register(RegisterRequest registerRequest) {
        if (!registerRequest.getPassword().equals(registerRequest.getConfirmPassword())) {
            throw new AppException(ErrorCode.CONFIRM_PASSWORD_FAILED);
        }
        if (accountRepository.existsByEmail(registerRequest.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }
        if (accountRepository.existsByPhoneNumber(registerRequest.getPhoneNumber())) {
            throw new AppException(ErrorCode.PHONE_EXISTED);
        }
        Role role = roleRepository.findByRoleName(RoleName.ROLE_USER)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
        Account account = accountMapper.toAccount(registerRequest);
        account.setPasswordHash(passwordEncoder.encode(registerRequest.getPassword()));
        account.setRoles(Set.of(role));
        account.setOnline(true);
        accountRepository.save(account);
        return buildAuthResponse(account);
    }
    @Override
    public void logout(String refreshToken) {
        RefreshToken tokenEntity = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() -> new AppException(ErrorCode.TOKEN_NOT_FOUND));
        tokenEntity.setRevoked(true);
        refreshTokenRepository.save(tokenEntity);
        log.info("Logout success for accountId={}", tokenEntity.getAccountId());
    }

    @Override
    public List<AccountDTO> getOnlineUsers() {
        return accountRepository.findByOnlineTrue()
                .stream()
                .map(
                        acc -> AccountDTO.builder()
                                .id(acc.getId())
                                .username(acc.getUsername())
                                .online(acc.isOnline())
                                .build()
                )
                .toList();
    }
    @Override
    public AuthResponse updateInfo(Long id, AccountUpdate accountUpdate) {
        Account acc = accountRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (accountUpdate.getEmail() != null
                && accountRepository.existsByEmail(accountUpdate.getEmail())
                && !accountUpdate.getEmail().equals(acc.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }
        if (accountUpdate.getPhoneNumber() != null
                && !accountUpdate.getPhoneNumber().equals(acc.getPhoneNumber())
                && accountRepository.existsByPhoneNumber(accountUpdate.getPhoneNumber())) {
            throw new AppException(ErrorCode.PHONE_EXISTED);
        }
        accountMapper.updateAccount(accountUpdate, acc);
        accountRepository.save(acc);
        return buildAuthResponse(acc);
    }
    @Override
    public void deleteMyAccount(String token) {
        Long accountId = jwtUtil.getAccountId(token);
        Account acc = accountRepository.findById(accountId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        accountRepository.delete(acc);
        log.info("User {} deleted successfully!", acc.getUsername());
    }
    @Override
    public RefreshResponse refreshToken(RefreshRequest refreshRequest) {
        String refreshToken = refreshRequest.getToken();
        // 1. verify token (check tồn tại + revoked + expired)
        RefreshToken tokenEntity = rtService.verifyToken(refreshToken);
        Long accountId = tokenEntity.getAccountId();
        // 2. revoke old refresh token (đẩy sang service)
        rtService.revokeToken(refreshToken);
        // 3. create new refresh token
        RefreshToken newRefreshToken = rtService.createRefreshToken(accountId);
        // 4. generate new access token
        String newAccessToken = atService.generateToken(accountId);
        // 5. return response
        return new RefreshResponse(
                newAccessToken,
                newRefreshToken.getToken()
        );
    }

    @Override
    public AccountDTO getCurrentUser(String token) {
        Long accountId=  jwtUtil.getAccountId(token);
        Account acc = accountRepository.findById(accountId)
                .orElseThrow(()->new AppException(ErrorCode.USER_NOT_FOUND));
        return accountMapper.toDTO(acc);
    }
    @Override
    public String uploadAvatar(MultipartFile file, String token) {
        // Validate file
        if (file.isEmpty()) throw new AppException(ErrorCode.INVALID_REQUEST);

        String contentType = file.getContentType();
        if (contentType == null ||
                (!contentType.equals("image/jpeg") && !contentType.equals("image/png"))) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        // Lấy account từ token
        Long accountId = jwtUtil.getAccountId(token);
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Lưu file vào thư mục uploads/avatars/
        String uploadDir = "uploads/avatars/";
        String fileName = "avatar_" + accountId + "_" + System.currentTimeMillis()
                + getExtension(file.getOriginalFilename());

        try {
            Path uploadPath = Path.of(uploadDir);
            if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);
            Files.copy(file.getInputStream(), uploadPath.resolve(fileName),
                    StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }
        String avatarUrl = "/uploads/avatars/" + fileName;
        account.setAvatarUrl(avatarUrl);
        accountRepository.save(account);
        return avatarUrl;
    }

    private String getExtension(String filename) {
        if (filename == null) return ".jpg";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : ".jpg";
    }
    private AuthResponse buildAuthResponse (Account acc){
        Set<String> roles = accountMapper.rolesToStrings(acc.getRoles());
        String token = jwtUtil.generateToken(acc.getId(), roles);
        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtUtil.getExpiration())
                .accountDTO(accountMapper.toDTO(acc))
                .build();
        }
    }


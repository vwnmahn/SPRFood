package com.example.testspring.service.impl;

import com.example.testspring.dto.*;
import com.example.testspring.entity.Account;
import com.example.testspring.entity.Role;
import com.example.testspring.entity.RoleName;
import com.example.testspring.exception.AppException;
import com.example.testspring.exception.ErrorCode;
import com.example.testspring.mapper.AccountMapper;
import com.example.testspring.repository.AccountRepository;
import com.example.testspring.repository.RoleRepository;
import com.example.testspring.security.JwtUtil;
import com.example.testspring.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {
    private final PasswordEncoder passwordEncoder;
    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final JwtUtil jwtUtil;
    private final AccountMapper  accountMapper;
    @Override
    public AuthResponse loginCommon(String identifier, String password, RoleName requiredRole) {
        Account account = accountRepository.findByPhone(identifier)
                .or(() -> accountRepository.findByEmail(identifier))
                .orElseThrow(() -> new AppException(ErrorCode.INCORRECT_ACCOUNT_OR_PASSWORD));
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
                RoleName.USER);
    }

    @Override
    public AuthResponse loginAdmin(LoginRequest loginRequest) {
        return loginCommon(loginRequest.getIdentifier(),
                loginRequest.getPassword(),
                RoleName.ADMIN);
    }

    @Override
    public AuthResponse register(RegisterRequest registerRequest) {
        if (!registerRequest.getPassword().equals(registerRequest.getConfirmPassword())) {
            throw new AppException(ErrorCode.CONFIRM_PASSWORD_FAILED);
        }
        if (accountRepository.existsByEmail(registerRequest.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }
        if (accountRepository.existsByPhone(registerRequest.getPhoneNumber())) {
            throw new AppException(ErrorCode.PHONE_EXISTED);
        }
        Role role = roleRepository.findByName(RoleName.USER)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
        Account account = accountMapper.createAccount(registerRequest);
        account.setPasswordHash(passwordEncoder.encode(registerRequest.getPassword()));
        account.setRoles(Set.of(role));
        account.setOnline(true);
        accountRepository.save(account);
        return buildAuthResponse(account);
    }

    @Override
    public void logout(String token) {
        Long userId = jwtUtil.getAccountId(token);
        Account acc = accountRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        acc.setOnline(false);
        accountRepository.save(acc);
        log.info("User {} logged out success!", userId);
    }

    @Override
    public List<AccountDTO> getOnlineUsers() {
        return accountRepository.findByIsOnlineTrue()
                .stream()
                .map(
                        acc -> AccountDTO.builder()
                                .id(acc.getId())
                                .username(acc.getUsername())
                                .isOnline(acc.isOnline())
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
                && accountRepository.existsByPhone(accountUpdate.getPhoneNumber())) {

            throw new AppException(ErrorCode.PHONE_EXISTED);
        }
        accountMapper.updateAccountFromDto(accountUpdate, acc);
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
        private AuthResponse buildAuthResponse (Account acc){
            Set<String> roles = acc.getRoles().stream()
                    .map(role -> role.getRoleName().name())
                    .collect(Collectors.toSet());
            String token = jwtUtil.generateToken(acc.getId(), roles);
            return AuthResponse.builder()
                    .token(token)
                    .tokenType("Bearer")
                    .expiresIn(jwtUtil.getExpiration())
                    .accountDTO(AccountDTO.builder()
                            .id(acc.getId())
                            .username(acc.getUsername())
                            .firstName(acc.getFirstName())
                            .lastName(acc.getLastName())
                            .email(acc.getEmail())
                            .phoneNumber(acc.getPhoneNumber())
                            .address(acc.getAddress())
                            .roles(roles)
                            .isOnline(acc.isOnline())
                            .build())
                    .build();
        }
    }


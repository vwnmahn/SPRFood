package com.example.testspring.service.impl;

import com.example.testspring.dto.AccountDTO;
import com.example.testspring.dto.AuthResponse;
import com.example.testspring.dto.LoginRequest;
import com.example.testspring.dto.RegisterRequest;
import com.example.testspring.entity.Account;
import com.example.testspring.entity.Role;
import com.example.testspring.entity.RoleName;
import com.example.testspring.exception.AppException;
import com.example.testspring.exception.ErrorCode;
import com.example.testspring.repository.AccountRepository;
import com.example.testspring.repository.RoleRepository;
import com.example.testspring.security.JwtUtil;
import com.example.testspring.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;
    private final JwtUtil jwtUtil;
    public String buildFullName(String firstName, String lastName) {
        return Stream.of(firstName, lastName)
                .filter(s->s != null && !s.isBlank())
                .map(String::trim)
                .collect(Collectors.joining(" "));
    }
    @Override
    public AuthResponse loginCommon(String identifier, String password, boolean isUserLogin) {
        Optional<Account> accountOtp= accountRepository.findByEmail(identifier);
        if(accountOtp.isEmpty()) {
            accountOtp = accountRepository.findByPhone(identifier);
        }
        Account account = accountOtp.orElseThrow(
                ()-> new AppException(ErrorCode.INCORRECT_ACCOUNT_OR_PASSWORD)
        );
        if(isUserLogin && !hashCode(account,RoleName.USER)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        if(!isUserLogin && !hashCode(account,RoleName.ADMIN)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        validateAccountAndPassword(account,password);
        return buildAuthResponse(account);
    }
    @SuppressWarnings({"ConstantConditions","all"})
    private boolean hashCode(Account account, RoleName roleName) {
        if(account == null || roleName == null || account.getRoles() == null ) {
            return false;
        }
        return account.getRoles().stream()
                .anyMatch(role -> role.getName()==roleName);
    }
    @Override
    public void logout() {
        log.info("Logout successful");
    }
    private void validateAccountAndPassword(Account account, String rawPassword) {
        if(!account.isActive())
            throw new AppException(ErrorCode.ACCOUNT_LOCKED);
        if(!passwordEncoder.matches(rawPassword,account.getPasswordHash()))
            throw new AppException(ErrorCode.INCORRECT_PASSWORD);
    }
    @Override
    public AuthResponse register(RegisterRequest registerRequest) {
        if(accountRepository.existsByEmail(registerRequest.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_EXISTS);
        }
        if(accountRepository.existsByPhone(registerRequest.getPhone())) {
            throw new AppException(ErrorCode.PHONE_EXISTS);
        }
        if(registerRequest.getFirstName() == null
        || registerRequest.getFirstName().isBlank()){
            throw new AppException(ErrorCode.FIRST_NAME_INVALID);
        }
        if(registerRequest.getLastName() == null
        || registerRequest.getLastName().isBlank()){
            throw new AppException(ErrorCode.LAST_NAME_INVALID);
        }
        Role role= roleRepository.findByName(RoleName.USER)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
        Account account= Account.builder()
                .fullName(buildFullName(registerRequest.getFirstName(), registerRequest.getLastName()))
                .passwordHash(passwordEncoder.encode(registerRequest.getPassword()))
                .email(registerRequest.getEmail())
                .phone(registerRequest.getPhone())
                .roles(Set.of(role))
                .address(registerRequest.getAddress())
                .createAt(Instant.now())
                .updateAt(Instant.now())
                .active(true)
                .build();
        accountRepository.save(account);
        return null;
    }
    @Override
    public AuthResponse loginUser(LoginRequest loginRequest) {
        return loginCommon(loginRequest.getIdentifier(),
                loginRequest.getPassword(),
                true);
    }

    @Override
    public AuthResponse loginAdmin(LoginRequest loginRequest) {
        return loginCommon(loginRequest.getIdentifier(),
                loginRequest.getPassword(),
                false);
    }
    public AuthResponse buildAuthResponse(Account account) {
        Set<String> roleName= account.getRoles().stream()
                .map(role->role.getName().name())
                .collect(Collectors.toSet());
        String token = jwtUtil.generateToken(account.getId(),roleName);
        return AuthResponse.builder()
                .token(token)
                .tokenType(token)
                .expiresIn(jwtUtil.getExpiration(token))
                .accountDTO(AccountDTO.builder()
                        .id(account.getId())
                        .fullName(account.getFullName())
                        .email(account.getEmail())
                        .phone(account.getPhone())
                        .address(account.getAddress())
                        .roles(account.getRoles())
                        .active(account.isActive())
                        .build())
                .build();
    }
}

package com.example.testspring.dto;

import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    private String tokenType;
    private Long expiresIn;
    private AccountDTO accountDTO;
}

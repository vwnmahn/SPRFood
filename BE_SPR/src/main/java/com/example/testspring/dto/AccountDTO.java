package com.example.testspring.dto;

import lombok.*;

import java.time.Instant;
import java.util.Set;
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AccountDTO {
    private Long id;
    private String username;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private String address;
    private Set<String> roles;
    private boolean online;
}

package com.example.testspring.dto;

import com.example.testspring.entity.Role;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Set;
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountDTO {
    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private Set<Role> roles;
    private String address;
    private boolean active;
}

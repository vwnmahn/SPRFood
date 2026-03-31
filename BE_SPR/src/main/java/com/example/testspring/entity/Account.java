package com.example.testspring.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Set;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name = "account")
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "password_hash",length = 255,nullable = false)
    private String passwordHash;
    @Column(name = "full_name",nullable = false)
    private String fullName;
    @Column(unique = true,nullable = false)
    private String email;
    @Column(unique = true,nullable = false)
    private String phone;
    @Column(name = "create_at",nullable = false)
    private Instant createAt;
    @Column(name = "update_at",nullable = false)
    private Instant updateAt;
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name= "account_role",
            joinColumns = @JoinColumn(name = "account_id"),
            inverseJoinColumns =  @JoinColumn(name = "role_id")
    )
    private Set<Role> roles;
    @Column(nullable = false)
    private String address;
    @Column(nullable = false)
    private boolean active;
    @PrePersist
    public void prePersist() {
        this.createAt = Instant.now();
        this.updateAt = Instant.now();
    }
    @PreUpdate
    public void preUpdate() {
        this.updateAt = Instant.now();
    }
}

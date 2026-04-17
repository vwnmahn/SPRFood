package com.example.testspring.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "account")
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "account_id", nullable = false)
    private Long id;
    @Column(name = "user_name", nullable = false)
    private String username;
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    @Column(name = "first_name", nullable = false,length = 50)
    private String firstName;
    @Column(name = "last_name",nullable = false,length = 50)
    private String lastName;
    @Column(nullable = false,unique = true)
    private String email;
    @Column(name = "phone_number",nullable = false)
    private String phoneNumber;
    @Column(nullable = false)
    private String address;
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "account_role",
            joinColumns = @JoinColumn(name = "account_id"),
            inverseJoinColumns = @JoinColumn(name="role_id")
    )
    @Builder.Default
    private Set<Role> roles= new HashSet<>();
    @CreationTimestamp
    @Column(name = "create_at",nullable = false)
    private Instant createdAt;
    @UpdateTimestamp
    @Column(name = "update_at",nullable = false)
    private Instant updatedAt;
    @Column(nullable = false)
    private boolean enabled;
    @Column(nullable = false)
    private boolean locked;
    @Column(name = "lock_time",nullable = false)
    private Instant lockTime;
    @Column(name = "online",nullable = false)
    private boolean isOnline;
    @PrePersist
    public void prePersist() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }
    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }
}

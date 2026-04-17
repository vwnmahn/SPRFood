package com.example.testspring.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Set;


@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "role")
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="role_id",nullable = false)
    private Long id;
    @Enumerated(EnumType.STRING)
    private RoleName roleName;
    @ManyToMany(mappedBy = "roles")
    private Set<Account> accounts;
}

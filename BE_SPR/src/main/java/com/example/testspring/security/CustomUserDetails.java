package com.example.testspring.security;

import com.example.testspring.entity.Account;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
@RequiredArgsConstructor
public class CustomUserDetails implements UserDetails {
    private final Account account;
    public Account getAccount() {
        return account;
    }
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }
    @Override
    public boolean isAccountNonLocked() {
        return !account.isLocked();
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
    @Override
    public boolean isEnabled() {
        return account.isEnabled();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return account.getRoles().stream()
                .map(role-> new SimpleGrantedAuthority("ROLE_" + role.getRoleName().name()))
                .toList();
    }

    @Override
    public @Nullable String getPassword() {
        return account.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return account.getPhoneNumber() !=null
                ? account.getPhoneNumber()
                : account.getEmail();
    }
}

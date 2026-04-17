package com.example.testspring.config;

import com.example.testspring.entity.Account;
import com.example.testspring.repository.AccountRepository;
import com.example.testspring.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
public class BeanConfig {
    private final AccountRepository accountRepository;
    private final CustomUserDetails customUserDetails;
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    @Bean
    private UserDetailsService userDetailsService() {
        return username -> {
            Account account = accountRepository.findByPhoneOrEmail(username)
                    .orElseThrow(()->new UsernameNotFoundException(
                            "Không tìm thấy tài khoản !!!" + username
                    ));
            return new CustomUserDetails(account);
        };
    }
}

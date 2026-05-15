package com.example.testspring.security;

import com.example.testspring.entity.Account;
import com.example.testspring.repository.AccountRepository;
import com.example.testspring.repository.RoleRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtFilter extends OncePerRequestFilter {
    private final JwtUtil jwtUtil;
    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        try{
            String token = extractToken(request);
            if(token !=null
            && jwtUtil.validateToken(token)
            && SecurityContextHolder.getContext().getAuthentication() == null){
                Long accountId = jwtUtil.getAccountId(token);
                accountRepository.findById(accountId).ifPresent(account -> {
                    var auth = buildAuthentication(account,request,token);
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
            }
            filterChain.doFilter(request, response);
        }
        catch (JwtException | IllegalArgumentException e){
            log.error("JwtFilter exception", e);
        }
    }
    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if(header != null && header.startsWith("Bearer ")){
            return  header.substring(7);
        }
        return null;
    }
    public UsernamePasswordAuthenticationToken buildAuthentication(Account account, HttpServletRequest request, String token) {
        // Lấy roles từ JWT thay vì account.getRoles()
        Set<String> roles = jwtUtil.getRoles(token);
        Collection<GrantedAuthority> authorities = roles.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
        CustomUserDetails customUserDetails = new CustomUserDetails(account);
        UsernamePasswordAuthenticationToken authToken =
                new UsernamePasswordAuthenticationToken(customUserDetails, null, authorities);
        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        return authToken;
    }
}

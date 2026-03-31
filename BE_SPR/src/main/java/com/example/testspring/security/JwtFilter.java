package com.example.testspring.security;

import com.example.testspring.entity.Account;
import com.example.testspring.repository.AccountRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {
    private final JwtUtil jwtUtil;
    private final AccountRepository accountRepository;
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
         try{
             String token= extract(request);
             if(token!=null
             && jwtUtil.validateToken(token)
             && SecurityContextHolder.getContext().getAuthentication()==null){
                 Long accountId=jwtUtil.getAccountId(token);
                 accountRepository.findById(accountId)
                         .filter(Account::isActive)
                         .ifPresent(account->{
                             var auth=buildAuthentication(account,request);
                             SecurityContextHolder.getContext().setAuthentication(auth);
                         });
                         filterChain.doFilter(request,response);
             }
         }catch (io.jsonwebtoken.JwtException e){
             log.error("JwtFilter Exception: ", e);
         }

    }
    private String extract(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if(header!=null && header.startsWith("Bearer ")){
            return  header.substring(7);
        }
        return null;
    }
    public UsernamePasswordAuthenticationToken buildAuthentication(Account account, HttpServletRequest request) {
        List<SimpleGrantedAuthority> authorities = account.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getName()))
                .toList();
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(account,null,authorities);
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        return auth;
    }
}

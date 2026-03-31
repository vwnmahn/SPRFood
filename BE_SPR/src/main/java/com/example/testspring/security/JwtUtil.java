package com.example.testspring.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;


import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Component
@RequiredArgsConstructor
public class JwtUtil {
    @Value("${jwt.secret}")
    private String secret;
    @Value("${jwt.expiration}")
    private Long expiration;
    private SecretKey secretKey;
    private static final String ISSUER = "testspring-api";
    private static final String ROLE_KEY = "roles";
    @PostConstruct
    public void init() {
        this.secretKey= Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
    public String generateToken(Long accountId, Set<String> roles) {
        Instant now = Instant.now();
        return Jwts.builder()
                .setSubject(accountId.toString())
                .claim(ROLE_KEY,roles)
                .setIssuer(ISSUER)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusMillis(expiration)))
                .signWith(secretKey, SignatureAlgorithm.HS256)
                .compact();
    }
    public String extractToken(String token) {
        if(token != null && token.startsWith("Bearer ")) {
            return token.substring(7);
        }
        return null;
    }
    public Claims parseToken(String token) {
        String rawToken = extractToken(token);
        if(rawToken == null) {
            throw new JwtException("Invalid Jwt token format");
        }
        return Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(rawToken).getBody();
    }
    public boolean validateToken(String token) {
        try{
            Claims claims = parseToken(token);
            return ISSUER.equals(claims.getIssuer())
                    && !isExpiredToken(claims);
        }
        catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
    public boolean isExpiredToken(Claims claims) {
        return claims.getExpiration() == null
                || claims.getExpiration().before(new Date());
    }
    public Long getAccountId(String token) {
        try{
            return Long.parseLong(parseToken(token).getSubject());
        }
        catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
    @SuppressWarnings("unchecked")
    public Set<String> getRoles(String token) {
        try{
            List<String> raw=parseToken(token).get(ROLE_KEY,List.class);
            if(raw==null)
                return Collections.emptySet();
            Set<String> roles=new HashSet<>();
            for(Object o:raw) {
                roles.add(String.valueOf(o));
            }
            return roles;
        }
        catch (JwtException | IllegalArgumentException e) {
            return Collections.emptySet();
        }
    }
    public Long getExpiration(String token) {
        try{
            Date expiration=parseToken(token).getExpiration();
            return expiration!=null?expiration.getTime():null;
        }
        catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
    public boolean isExpired(String token) {
        try{
            return isExpiredToken(parseToken(token));
        }
        catch (JwtException | IllegalArgumentException e) {
            return true;
        }
    }
}

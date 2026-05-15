package com.example.testspring.security;

import com.example.testspring.exception.AppException;
import com.example.testspring.exception.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class JwtUtil {
    @Value("${jwt.secret}")
    private String secret;
    @Value("${jwt.expiration}")
    private long expiration;
    private SecretKey secretKey;
    public static final String ISSUER = "test-api";
    private static final String ROLE_KEY = "roles";
    @PostConstruct
    public void init() {
        this.secretKey= Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
    public String generateToken(Long accountId, Set<String> roles) {
        Instant now = Instant.now();
        return Jwts.builder()
                .setSubject(accountId.toString())
                .claim(ROLE_KEY, new ArrayList<>(roles))
                .setIssuer(ISSUER)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusMillis(expiration)))
                .signWith(secretKey, SignatureAlgorithm.HS256)
                .compact();
    }
    public String extract(String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            throw new JwtException("Invalid Authorization header");
        }
        return token.substring(7);
    }
    private Claims parseToken(String token){
        return Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
    public boolean validateToken(String token){
        try{
            Claims claims = parseToken(token);
            return ISSUER.equals(claims.getIssuer())
                    && claims.getSubject() != null
                    && !isExpiredToken(claims);
        }
        catch (JwtException | IllegalArgumentException e){
            return false;
        }
    }
    private boolean isExpiredToken(Claims claims){
        return claims.getExpiration() == null
                || claims.getExpiration().before(new Date());
    }
    public Long getAccountId(String token){
        try{
            return Long.parseLong(parseToken(token).getSubject());
        }
        catch (JwtException | IllegalArgumentException e){
            throw new AppException(ErrorCode.INVALID_TOKEN);
        }
    }
    public Set<String> getRoles(String token) {
        try {
            Claims claims = parseToken(token);
            Object raw = claims.get(ROLE_KEY);
            if (!(raw instanceof List<?> list)) {
                return Collections.emptySet();
            }
            return list.stream()
                    .filter(Objects::nonNull)
                    .map(String::valueOf)
                    .collect(Collectors.toSet());
        } catch (JwtException | IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_TOKEN);
        }
    }
    public Long getExpiration(){
        return expiration;
    }
    public boolean isExpired(String token){
        try{
            return isExpiredToken(parseToken(token));
        }
        catch (JwtException | IllegalArgumentException e){
            return true;
        }
    }
}

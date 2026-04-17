package com.example.testspring.repository;

import com.example.testspring.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account,Long> {
    @Query("SELECT a FROM Account a WHERE a.phone = :input OR a.email = :input")
    Optional<Account> findByPhoneOrEmail(@Param("input") String input);

    boolean existsByPhone(String phone);
    boolean existsByEmail(String email);
    Optional<Account> findByPhone(String phone);
    Optional<Account> findByEmail(String email);
    List<Account> findByIsOnlineTrue();
    Optional<Account> findById(Long id);
}

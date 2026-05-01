package com.example.testspring.repository;

import com.example.testspring.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
@Repository
public interface AccountRepository extends JpaRepository<Account,Long> {
//    @Query("SELECT a FROM Account a WHERE a.phone = :input OR a.email = :input")
//    Optional<Account> findByPhoneOrEmail(@Param("input") String input);

    boolean existsByPhoneNumber(String phone);
    boolean existsByEmail(String email);
    Optional<Account> findByPhoneNumber(String phoneNumber);
    Optional<Account> findByEmail(String email);
    List<Account> findByOnlineTrue();
    Optional<Account> findById(Long id);
}

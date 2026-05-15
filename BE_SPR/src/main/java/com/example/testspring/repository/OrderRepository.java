package com.example.testspring.repository;

import com.example.testspring.entity.Account;
import com.example.testspring.entity.Order;
import com.example.testspring.entity.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // SỬA: Instant -> LocalDateTime
    List<Order> findByAccountOrderByCreatedAtDesc(Account account);

    Page<Order> findByAccount(Account account, Pageable pageable);

    Optional<Order> findByOrderCode(String orderCode);

    List<Order> findByAccountAndStatus(Account account, OrderStatus status);

    long countByStatus(OrderStatus status);

    List<Order> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    Page<Order> findByAccountAndStatus(Account account, OrderStatus status, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.restaurantName LIKE %:restaurantName%")
    List<Order> findByRestaurantNameContaining(@Param("restaurantName") String restaurantName);

    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.items WHERE o.id = :orderId")
    Optional<Order> findByIdWithItems(@Param("orderId") Long orderId);

    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.items WHERE o.account = :account ORDER BY o.createdAt DESC")
    List<Order> findByAccountWithItems(@Param("account") Account account);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.account = :account AND o.status = :status")
    long countByAccountAndStatus(@Param("account") Account account, @Param("status") OrderStatus status);

    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.items WHERE o.account = :account ORDER BY o.createdAt DESC")
    Page<Order> findByAccountWithItems(@Param("account") Account account, Pageable pageable);
    // Lấy TẤT CẢ đơn hàng kèm thông tin account (JOIN FETCH)
    @Query("SELECT o FROM Order o JOIN FETCH o.account ORDER BY o.createdAt DESC")
    List<Order> findAllWithAccount();

    // Lấy đơn hàng theo STATUS kèm thông tin account
    @Query("SELECT o FROM Order o JOIN FETCH o.account WHERE o.status = :status ORDER BY o.createdAt DESC")
    List<Order> findByStatusWithAccount(@Param("status") OrderStatus status);
}
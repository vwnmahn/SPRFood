package com.example.testspring.controller;

import com.example.testspring.dto.OrderResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class NotificationController {

    private final SimpMessagingTemplate messagingTemplate;

    // Hàm này sẽ được gọi để gửi thông báo đến admin
    public void notifyNewOrder(Object orderData) {
        // Gửi dữ liệu đơn hàng đến tất cả client đang lắng nghe "/topic/new-orders"
        messagingTemplate.convertAndSend("/topic/new-orders", orderData);
    }
    public void notifyOrderCancelled(OrderResponse order) {
        messagingTemplate.convertAndSend("/topic/cancelled-orders", order);
    }
    public void notifyOrderUpdated(OrderResponse order) {
        messagingTemplate.convertAndSend("/topic/updated-orders", order);
    }
}
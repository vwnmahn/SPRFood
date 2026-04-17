package com.example.testspring.dto;

import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ApiResponse <T>{
    @Builder.Default
    private int code=1000;
    private String message;
    private T data;

}

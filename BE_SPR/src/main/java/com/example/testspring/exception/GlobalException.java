package com.example.testspring.exception;

import com.example.testspring.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalException {
    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Object>> appExceptionHandler(AppException e) {
        return ResponseEntity.status(e.getErrorCode().getHttpStatus())
                .body(ApiResponse.<Object>builder()
                        .code(e.getErrorCode().getCode())
                        .message(e.getErrorCode().getMessage())
                        .data(null)
                        .build());
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, List<String>>>> methodArgumentNotValidExceptionHandler(MethodArgumentNotValidException e) {
        Map<String,List<String>> errors = e.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.groupingBy(
                        FieldError::getField,
                        Collectors.mapping(FieldError::getDefaultMessage, Collectors.toList())
                ));
        log.warn("Validate Errors: {}", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.<Map<String,List<String>>>builder()
                        .code(400)
                        .message("Validated failed")
                        .data(errors)
                        .build());
    }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> exceptionHandler(Exception e) {
        log.error("Exception: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<Object>builder()
                        .code(500)
                        .message("Internal_Server_Error")
                        .data(null)
                        .build());
    }
}

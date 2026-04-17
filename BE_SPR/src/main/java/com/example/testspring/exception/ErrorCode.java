package com.example.testspring.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpStatus;
@Getter
@AllArgsConstructor
@NoArgsConstructor
public enum ErrorCode {
    CONFIRM_PASSWORD_FAILED(1001,"ConfirmPassword Failed",HttpStatus.CONFLICT),
    EMAIL_EXISTED(1002,"Email Existed",HttpStatus.CONFLICT),
    PHONE_EXISTED(1003,"Phone Existed",HttpStatus.CONFLICT),
    ROLE_NOT_FOUND(1004,"Role Not Found",HttpStatus.NOT_FOUND),
    INVALID_TOKEN(1005,"Invalid Token",HttpStatus.UNAUTHORIZED),
    INCORRECT_ACCOUNT_OR_PASSWORD(1006,"Incorrect Account Password",HttpStatus.UNAUTHORIZED),
    FORBIDDEN(1007,"Forbidden",HttpStatus.FORBIDDEN),
    ACCOUNT_DISABLED(1008,"Account Disabled",HttpStatus.FORBIDDEN),
    USER_NOT_FOUND(1009,"User Not Found",HttpStatus.NOT_FOUND),
    ;
    private int code;
    private String message;
    private HttpStatus httpStatus;
}

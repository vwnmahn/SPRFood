package com.example.testspring.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.http.HttpStatus;
@Getter
@AllArgsConstructor
@NoArgsConstructor
public enum ErrorCode {
    FIRST_NAME_INVALID(1001,"First Name Invalid",HttpStatus.CONFLICT),
    LAST_NAME_INVALID(1002,"Last Name Invalid",HttpStatus.CONFLICT),
    EMAIL_EXISTS(1003,"Email Existed",HttpStatus.CONFLICT),
    PHONE_EXISTS(1004,"Phone Existed",HttpStatus.CONFLICT),
    ROLE_NOT_FOUND(1005,"Role Not Found",HttpStatus.NOT_FOUND),
    INCORRECT_PASSWORD(1006,"Incorrect Password",HttpStatus.BAD_REQUEST),
    ACCOUNT_LOCKED(1007,"Account Locked",HttpStatus.CONFLICT),
    INCORRECT_ACCOUNT_OR_PASSWORD(1008,"Incorrect Account or Password",HttpStatus.UNAUTHORIZED),
    FORBIDDEN(1009,"Forbidden",HttpStatus.FORBIDDEN),
    ;
    private int code;
    private String message;
    private HttpStatus httpStatus;
}

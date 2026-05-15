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
    INCORRECT_ACCOUNT_OR_PASSWORD(1006,"Incorrect Account Or Password",HttpStatus.UNAUTHORIZED),
    FORBIDDEN(1007,"Forbidden",HttpStatus.FORBIDDEN),
    ACCOUNT_DISABLED(1008,"Account Disabled",HttpStatus.FORBIDDEN),
    USER_NOT_FOUND(1009,"User Not Found",HttpStatus.NOT_FOUND),
    TOKEN_NOT_FOUND(10010,"Token Not Found",HttpStatus.NOT_FOUND),
    TOKEN_REVOKED(10011,"Token Revoked",HttpStatus.UNAUTHORIZED),
    TOKEN_EXPIRED(10012,"Token Expired",HttpStatus.UNAUTHORIZED),
    TOKEN_USED(10013,"Token Used",HttpStatus.UNAUTHORIZED),
    PASSWORD_EXISTED(10014,"Password Existed",HttpStatus.CONFLICT),
    UNAUTHORIZED(10015,"Unauthorized",HttpStatus.UNAUTHORIZED),
    INVALID_REQUEST(10016,"Invalid Request",HttpStatus.BAD_REQUEST),
    INTERNAL_ERROR(10017,"Internal Error",HttpStatus.INTERNAL_SERVER_ERROR),
    ;
    private int code;
    private String message;
    private HttpStatus httpStatus;
}

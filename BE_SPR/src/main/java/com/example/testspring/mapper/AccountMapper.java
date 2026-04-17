package com.example.testspring.mapper;

import com.example.testspring.dto.AccountUpdate;
import com.example.testspring.dto.RegisterRequest;
import com.example.testspring.entity.Account;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface AccountMapper {
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "roles", ignore = true)
    @Mapping(target = "isOnline", ignore = true)
    Account createAccount(RegisterRequest request);
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateAccountFromDto(AccountUpdate request,
                              @MappingTarget Account acc);

}

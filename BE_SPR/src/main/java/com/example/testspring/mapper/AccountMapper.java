package com.example.testspring.mapper;

import com.example.testspring.dto.AccountDTO;
import com.example.testspring.dto.AccountUpdate;
import com.example.testspring.dto.RegisterRequest;
import com.example.testspring.entity.Account;
import com.example.testspring.entity.Role;
import org.mapstruct.*;

import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface AccountMapper {

    // ========== CHUYỂN RegisterRequest → Account ==========
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "passwordHash", source = "password")
    @Mapping(target = "roles", ignore = true)
    @Mapping(target = "online", constant = "false")
    @Mapping(target = "enabled", constant = "true")
    @Mapping(target = "locked", constant = "false")
    @Mapping(target = "lockTime", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Account toAccount(RegisterRequest request);

    // ========== CẬP NHẬT Account từ AccountUpdate ==========
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "roles", ignore = true)
    @Mapping(target = "online", ignore = true)
    @Mapping(target = "enabled", ignore = true)
    @Mapping(target = "locked", ignore = true)
    @Mapping(target = "lockTime", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateAccount(AccountUpdate request, @MappingTarget Account account);

    // ========== CHUYỂN Account → AccountDTO ==========
    @Mapping(target = "online", source = "online")
    @Mapping(target = "roles", source = "roles", qualifiedByName = "rolesToStrings")
    AccountDTO toDTO(Account account);

    // ========== CHUYỂN ĐỔI Set<Role> → Set<String> ==========
    @Named("rolesToStrings")
    default Set<String> rolesToStrings(Set<Role> roles) {
        if (roles == null || roles.isEmpty()) {
            return Collections.emptySet();
        }
        return roles.stream()
                .map(role -> role.getRoleName().name())  // Lấy tên enum (ROLE_USER, ROLE_ADMIN...)
                .collect(Collectors.toSet());
    }
}
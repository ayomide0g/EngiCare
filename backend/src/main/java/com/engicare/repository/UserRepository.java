package com.engicare.repository;

import com.engicare.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    List<User> findAllByRoleOrderByFullNameAsc(String role);

    boolean existsByEmail(String email);
}
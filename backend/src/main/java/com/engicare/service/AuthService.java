package com.engicare.service;

import com.engicare.dto.RegisterRequest;
import com.engicare.entity.User;
import com.engicare.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.engicare.dto.LoginRequest;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }


    public User register(RegisterRequest request) {

        String email = request.email().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already registered");
        }

        String hashedPassword =
                passwordEncoder.encode(request.password());

        User user = new User(
                request.fullName(),
                email,
                hashedPassword,
                "student",
                request.department()
        );

        return userRepository.save(user);
    }
    public User login(LoginRequest request) {

        String email = request.email().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new IllegalArgumentException("Invalid email or password")
                );

        if (!passwordEncoder.matches(
                request.password(),
                user.getPasswordHash()
        )) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        return user;
    }

    public User currentUser(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}
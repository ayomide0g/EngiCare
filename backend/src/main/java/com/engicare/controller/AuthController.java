package com.engicare.controller;

import com.engicare.dto.RegisterRequest;
import com.engicare.entity.User;
import com.engicare.service.AuthService;
import com.engicare.service.JwtService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import com.engicare.dto.LoginRequest;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    private final JwtService jwtService;

    public AuthController(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequest request
    ) {

        try {
            User user = authService.register(request);

            return ResponseEntity.status(HttpStatus.CREATED).body(
                    Map.of(
                            "id", user.getId(),
                            "fullName", user.getFullName(),
                            "email", user.getEmail(),
                            "role", user.getRole()
                    )
            );

        } catch (IllegalArgumentException e) {

            return ResponseEntity.badRequest().body(
                    Map.of("error", e.getMessage())
            );
        }
    }
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request
    ) {
        try {
            User user = authService.login(request);

            return ResponseEntity.ok(
                    Map.of(
                            "message", "Login successful",
                            "accessToken", jwtService.issue(user),
                            "tokenType", "Bearer",
                            "expiresIn", JwtService.TOKEN_LIFETIME.toSeconds(),
                            "department", Objects.toString(user.getDepartment(), ""),
                            "id", user.getId(),
                            "fullName", user.getFullName(),
                            "email", user.getEmail(),
                            "role", user.getRole()
                    )
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) {
        User user = authService.currentUser(UUID.fromString(jwt.getSubject()));
        return Map.of(
                "id", user.getId(),
                "fullName", user.getFullName(),
                "email", user.getEmail(),
                "role", user.getRole(),
                "department", Objects.toString(user.getDepartment(), "")
        );
    }
}

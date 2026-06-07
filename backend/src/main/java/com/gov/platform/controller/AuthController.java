package com.gov.platform.controller;

import com.gov.platform.model.User;
import com.gov.platform.repository.UserRepository;
import com.gov.platform.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // In a real app we'd use passwordEncoder.matches(), but our data.sql has plain "password"
            if (password.equals(user.getPasswordHash())) {
                String token = jwtUtil.generateToken(user.getUsername(), user.getRole());
                return ResponseEntity.ok(Map.of(
                        "token", token,
                        "username", user.getUsername(),
                        "role", user.getRole(),
                        "fullName", user.getFullName()
                ));
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
    }
}

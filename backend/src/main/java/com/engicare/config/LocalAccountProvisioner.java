package com.engicare.config;

import com.engicare.entity.User;
import com.engicare.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("local-accounts")
public class LocalAccountProvisioner implements ApplicationRunner {
    private static final List<Account> ACCOUNTS = List.of(
            new Account("Local Staff", "staff@engicare.test", "staff", "ENGICARE_LOCAL_STAFF_PASSWORD"),
            new Account("Local Faculty", "faculty@engicare.test", "faculty_member", "ENGICARE_LOCAL_FACULTY_PASSWORD"),
            new Account("Local Admin", "admin@engicare.test", "admin", "ENGICARE_LOCAL_ADMIN_PASSWORD"),
            new Account("Local Technician", "technician@engicare.test", "technician", "ENGICARE_LOCAL_TECHNICIAN_PASSWORD")
    );

    private final DataSource dataSource;
    private final Environment environment;
    private final UserRepository users;
    private final PasswordEncoder passwords;

    public LocalAccountProvisioner(DataSource dataSource, Environment environment,
                                   UserRepository users, PasswordEncoder passwords) {
        this.dataSource = dataSource;
        this.environment = environment;
        this.users = users;
        this.passwords = passwords;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        try (var connection = dataSource.getConnection()) {
            if (!connection.getMetaData().getURL().startsWith("jdbc:h2:mem:")) {
                throw new IllegalStateException("The local-accounts profile requires in-memory H2");
            }
        }

        for (Account account : ACCOUNTS) {
            String password = environment.getProperty(account.passwordVariable());
            if (password == null) {
                continue;
            }
            if (password.isBlank() || password.length() < 12
                    || password.getBytes(StandardCharsets.UTF_8).length > 72) {
                throw new IllegalStateException(account.passwordVariable()
                        + " must be at least 12 characters and at most 72 UTF-8 bytes");
            }

            var existing = users.findByEmail(account.email());
            if (existing.isPresent()) {
                if (!account.role().equals(existing.get().getRole())) {
                    throw new IllegalStateException("Local account email is already in use: " + account.email());
                }
                continue;
            }
            users.save(new User(account.name(), account.email(), passwords.encode(password), account.role(), "general"));
        }
    }

    private record Account(String name, String email, String role, String passwordVariable) {}
}

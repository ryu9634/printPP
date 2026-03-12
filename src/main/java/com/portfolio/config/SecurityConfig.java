package com.portfolio.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${admin.username:admin}")
    private String adminUsername;

    @Value("${admin.password:admin123}")
    private String adminPassword;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        UserDetails admin = User.builder()
                .username(adminUsername)
                .password(passwordEncoder().encode(adminPassword))
                .roles("ADMIN")
                .build();

        return new InMemoryUserDetailsManager(admin);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authz -> authz
                .antMatchers("/", "/index.html").permitAll()
                .antMatchers("/styles/**", "/scripts/**").permitAll()
                .antMatchers("/uploads/**").permitAll()

                .antMatchers(HttpMethod.GET, "/api/health").permitAll()

                .antMatchers(HttpMethod.GET, "/api/categories").permitAll()
                .antMatchers(HttpMethod.GET, "/api/categories/*").permitAll()
                .antMatchers(HttpMethod.GET, "/api/posts").permitAll()
                .antMatchers(HttpMethod.GET, "/api/posts/*").permitAll()
                .antMatchers(HttpMethod.GET, "/api/posts/category/*").permitAll()
                .antMatchers(HttpMethod.GET, "/api/files/*").permitAll()
                .antMatchers(HttpMethod.GET, "/api/settings").permitAll()

                .antMatchers("/admin.html").hasRole("ADMIN")
                .antMatchers(HttpMethod.POST, "/api/settings").hasRole("ADMIN")
                .antMatchers(HttpMethod.POST, "/api/categories/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.PUT, "/api/categories/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.DELETE, "/api/categories/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.POST, "/api/posts/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.PUT, "/api/posts/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.DELETE, "/api/posts/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.POST, "/api/files/upload").hasRole("ADMIN")
                .antMatchers(HttpMethod.DELETE, "/api/files/*").hasRole("ADMIN")

                .anyRequest().authenticated()
            )

            .httpBasic()

            .and()

            .formLogin().disable()

            .logout(logout -> logout
                .logoutUrl("/api/logout")
                .logoutSuccessUrl("/")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
            )

            .csrf().disable()

            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'; " +
                        "script-src 'self' 'unsafe-inline' https://cdn.quilljs.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
                        "style-src 'self' 'unsafe-inline' https://cdn.quilljs.com https://cdn.jsdelivr.net https://fonts.googleapis.com; " +
                        "img-src 'self' data: blob: https://img.youtube.com; " +
                        "font-src 'self' https://fonts.gstatic.com; " +
                        "frame-src 'self' https://www.youtube.com; " +
                        "worker-src 'self' blob: https://cdnjs.cloudflare.com")
                )
                .frameOptions().sameOrigin()
            );

        return http.build();
    }
}

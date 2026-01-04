package com.portfolio.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Spring Security 설정 클래스
 *
 * 주요 기능:
 * - 관리자 페이지(/admin, /api/admin/*) 인증 필요
 * - 일반 사용자 페이지는 공개
 * - HTTP Basic Authentication 사용
 * - CSRF 보호 활성화
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${admin.username:admin}")
    private String adminUsername;

    @Value("${admin.password:admin123}")
    private String adminPassword;

    /**
     * 비밀번호 암호화를 위한 BCryptPasswordEncoder 빈 등록
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * 인메모리 사용자 관리 (개발/테스트용)
     * 프로덕션에서는 데이터베이스 기반 인증으로 교체 권장
     */
    @Bean
    public UserDetailsService userDetailsService() {
        UserDetails admin = User.builder()
                .username(adminUsername)
                .password(passwordEncoder().encode(adminPassword))
                .roles("ADMIN")
                .build();

        return new InMemoryUserDetailsManager(admin);
    }

    /**
     * Security Filter Chain 설정
     *
     * 보안 정책:
     * 1. 공개 접근 허용:
     *    - 메인 페이지 (/)
     *    - 공개 API (/api/categories, /api/posts, /api/files/{fileName})
     *    - 정적 리소스 (/styles/**, /scripts/**, /uploads/**)
     *
     * 2. 인증 필요:
     *    - 관리자 페이지 (/admin, /admin/**)
     *    - 관리 API (/api/categories/**, /api/posts/**, /api/files/upload)
     *
     * 3. CSRF 보호:
     *    - REST API는 CSRF 비활성화 (Stateless)
     *    - 일반 폼은 CSRF 활성화
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 권한 설정
            .authorizeHttpRequests(authz -> authz
                // 공개 접근 허용 (인증 불필요)
                .antMatchers("/", "/index.html").permitAll()
                .antMatchers("/styles/**", "/scripts/**").permitAll()
                .antMatchers("/uploads/**").permitAll()

                // 공개 API - GET 요청만 허용
                .antMatchers("GET", "/api/categories").permitAll()
                .antMatchers("GET", "/api/categories/*").permitAll()
                .antMatchers("GET", "/api/posts").permitAll()
                .antMatchers("GET", "/api/posts/*").permitAll()
                .antMatchers("GET", "/api/posts/category/*").permitAll()
                .antMatchers("GET", "/api/files/*").permitAll()

                // 관리자 페이지 - 인증 필요
                .antMatchers("/admin", "/admin/**").hasRole("ADMIN")

                // 관리 API - 인증 필요 (POST, PUT, DELETE)
                .antMatchers("/api/categories/**").hasRole("ADMIN")
                .antMatchers("/api/posts/**").hasRole("ADMIN")
                .antMatchers("/api/files/upload").hasRole("ADMIN")
                .antMatchers("DELETE", "/api/files/*").hasRole("ADMIN")

                // 그 외 모든 요청은 인증 필요
                .anyRequest().authenticated()
            )

            // HTTP Basic Authentication 활성화
            // 브라우저 기본 인증 창 표시
            .httpBasic()

            .and()

            // 폼 로그인 비활성화 (REST API 위주이므로)
            .formLogin().disable()

            // 로그아웃 설정
            .logout(logout -> logout
                .logoutUrl("/api/logout")
                .logoutSuccessUrl("/")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
            )

            // CSRF 설정
            .csrf(csrf -> csrf
                // REST API 경로는 CSRF 비활성화 (Stateless)
                .ignoringAntMatchers("/api/**")
            );

        return http.build();
    }
}

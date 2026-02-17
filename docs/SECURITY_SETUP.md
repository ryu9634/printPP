# Spring Security 설정 가이드

## 개요

printPP 프로젝트에 Spring Security를 적용하여 관리자 페이지와 API를 보호합니다.

## 적용된 보안 기능

### 1. 인증 (Authentication)
- ✅ HTTP Basic Authentication 방식 사용
- ✅ BCrypt 비밀번호 암호화
- ✅ 인메모리 사용자 저장소 (개발/테스트용)
- ✅ 환경별 관리자 계정 설정

### 2. 인가 (Authorization)
- ✅ Role 기반 접근 제어 (RBAC)
- ✅ URL 패턴 기반 권한 설정
- ✅ HTTP 메서드별 권한 분리

### 3. CSRF 보호
- ✅ REST API는 CSRF 비활성화 (Stateless)
- ✅ 일반 폼은 CSRF 활성화

---

## 보안 정책

### 공개 접근 (인증 불필요)

#### 페이지
- `/` - 메인 포트폴리오 페이지
- `/index.html` - 인덱스 페이지

#### 정적 리소스
- `/styles/**` - CSS 파일
- `/scripts/**` - JavaScript 파일
- `/uploads/**` - 업로드된 이미지

#### 공개 API (GET 요청만)
```
GET /api/categories           # 카테고리 목록 조회
GET /api/categories/{id}      # 카테고리 상세 조회
GET /api/posts                # 포스트 목록 조회
GET /api/posts/{id}           # 포스트 상세 조회
GET /api/posts/category/{id}  # 카테고리별 포스트 조회
GET /api/files/{fileName}     # 파일 다운로드
```

### 인증 필요 (ADMIN 권한)

#### 관리자 페이지
- `/admin` - 관리자 대시보드
- `/admin/**` - 모든 관리자 페이지

#### 관리 API
```
POST   /api/categories        # 카테고리 생성
PUT    /api/categories/{id}   # 카테고리 수정
DELETE /api/categories/{id}   # 카테고리 삭제

POST   /api/posts             # 포스트 생성
PUT    /api/posts/{id}        # 포스트 수정
DELETE /api/posts/{id}        # 포스트 삭제

POST   /api/files/upload      # 파일 업로드
DELETE /api/files/{fileName}  # 파일 삭제
```

---

## 사용 방법

### 1. 로컬 개발 환경

#### 기본 관리자 계정
```
Username: admin
Password: admin123
```

#### 로그인 방법

**브라우저에서 관리자 페이지 접근:**
1. http://localhost:8080/admin 접속
2. 브라우저 기본 인증 창이 표시됩니다
3. 위 계정 정보 입력
4. 로그인 성공

**API 호출 시 (curl):**
```bash
# Basic Auth 헤더 포함
curl -u admin:admin123 http://localhost:8080/api/posts

# 또는 Authorization 헤더 직접 설정
curl -H "Authorization: Basic YWRtaW46YWRtaW4xMjM=" http://localhost:8080/api/posts
```

**API 호출 시 (JavaScript):**
```javascript
// Fetch API 사용
fetch('http://localhost:8080/api/posts', {
    headers: {
        'Authorization': 'Basic ' + btoa('admin:admin123')
    }
})
.then(response => response.json())
.then(data => console.log(data));

// Axios 사용
axios.get('http://localhost:8080/api/posts', {
    auth: {
        username: 'admin',
        password: 'admin123'
    }
})
.then(response => console.log(response.data));
```

#### 관리자 계정 변경 방법

**application-local.properties 수정:**
```properties
admin.username=myuser
admin.password=mypassword
```

**또는 실행 시 환경 변수로 전달:**
```bash
java -jar \
  -Dadmin.username=myuser \
  -Dadmin.password=mypassword \
  portfolio-backend-1.0.0.jar
```

---

### 2. 프로덕션 환경

#### ⚠️ 중요: 환경 변수 필수 설정

프로덕션에서는 **반드시** 환경 변수로 관리자 계정을 설정해야 합니다.

**AWS Elastic Beanstalk:**
```bash
# EB CLI 사용
eb setenv ADMIN_USERNAME=your_username ADMIN_PASSWORD=your_secure_password

# 또는 AWS Console에서:
# 환경 구성 > 소프트웨어 > 환경 속성 추가
```

**AWS EC2 / Linux 서버:**
```bash
# 환경 변수 설정
export ADMIN_USERNAME=your_username
export ADMIN_PASSWORD=your_secure_password

# 또는 systemd 서비스 파일에 추가
[Service]
Environment="ADMIN_USERNAME=your_username"
Environment="ADMIN_PASSWORD=your_secure_password"
```

**Docker:**
```bash
# docker run 사용
docker run -d \
  -e ADMIN_USERNAME=your_username \
  -e ADMIN_PASSWORD=your_secure_password \
  -p 8080:8080 \
  portfolio-backend:latest

# docker-compose.yml
services:
  backend:
    environment:
      - ADMIN_USERNAME=your_username
      - ADMIN_PASSWORD=your_secure_password
```

**Maven 실행 시:**
```bash
mvn spring-boot:run \
  -Dspring-boot.run.arguments="\
    --admin.username=your_username \
    --admin.password=your_secure_password"
```

---

## 로그아웃

**API 호출:**
```bash
curl -X POST http://localhost:8080/api/logout
```

**브라우저:**
- 브라우저를 닫으면 세션이 종료됩니다
- 또는 `/api/logout` 엔드포인트를 호출합니다

---

## 보안 강화 권장 사항

### 현재 구현 (개발 단계)
- ✅ HTTP Basic Authentication
- ✅ 인메모리 사용자 저장소
- ✅ BCrypt 비밀번호 암호화
- ✅ Role 기반 접근 제어
- ✅ CSRF 보호

### 프로덕션 배포 시 추가 권장
1. **HTTPS 필수**
   ```properties
   # application-prod.properties
   server.ssl.enabled=true
   server.ssl.key-store=classpath:keystore.p12
   server.ssl.key-store-password=${SSL_PASSWORD}
   server.ssl.key-store-type=PKCS12
   ```

2. **JWT 토큰 인증으로 전환**
   - 현재: HTTP Basic (매 요청마다 username/password 전송)
   - 권장: JWT (토큰 기반 인증)
   - 장점: Stateless, 확장성 향상

3. **데이터베이스 기반 사용자 관리**
   ```java
   // User 엔티티 생성
   @Entity
   public class User {
       @Id
       private String username;
       private String password;
       private String role;
   }

   // UserDetailsService 구현
   @Service
   public class CustomUserDetailsService implements UserDetailsService {
       @Autowired
       private UserRepository userRepository;

       // ...
   }
   ```

4. **비밀번호 정책 강화**
   - 최소 길이: 12자 이상
   - 복잡도: 대소문자 + 숫자 + 특수문자
   - 정기적 변경 유도

5. **Rate Limiting (속도 제한)**
   - 로그인 시도 제한 (예: 5분에 5회)
   - IP 기반 차단
   - Spring Security + Bucket4j 사용

6. **감사 로그 (Audit Log)**
   ```java
   @Aspect
   @Component
   public class SecurityAuditAspect {
       @AfterReturning("@annotation(org.springframework.security.access.prepost.PreAuthorize)")
       public void logSecurityEvent(JoinPoint joinPoint) {
           // 로그인/로그아웃/권한 변경 등 기록
       }
   }
   ```

7. **Multi-Factor Authentication (MFA)**
   - Google Authenticator
   - SMS 인증
   - 이메일 인증

---

## 문제 해결

### 1. 403 Forbidden 에러

**증상:**
```json
{
  "timestamp": "2026-01-04T12:00:00.000+00:00",
  "status": 403,
  "error": "Forbidden",
  "path": "/admin"
}
```

**원인:**
- 인증 헤더가 없거나 잘못됨
- 권한이 부족함 (ADMIN 권한 필요)

**해결:**
```bash
# 올바른 인증 헤더 포함
curl -u admin:admin123 http://localhost:8080/admin
```

---

### 2. 401 Unauthorized 에러

**증상:**
```json
{
  "timestamp": "2026-01-04T12:00:00.000+00:00",
  "status": 401,
  "error": "Unauthorized",
  "path": "/api/posts"
}
```

**원인:**
- 잘못된 username/password
- Basic Auth 헤더 포맷 오류

**해결:**
1. username/password 확인
2. Base64 인코딩 확인
   ```javascript
   // "admin:admin123"를 Base64로 인코딩하면
   btoa('admin:admin123') // "YWRtaW46YWRtaW4xMjM="
   ```

---

### 3. CORS 에러 (브라우저)

**증상:**
```
Access to fetch at 'http://localhost:8080/api/posts' from origin
'http://localhost:3000' has been blocked by CORS policy
```

**원인:**
- `withCredentials: true` 없이 인증 요청
- CORS 설정 누락

**해결:**
```javascript
// Fetch API
fetch('http://localhost:8080/api/posts', {
    headers: {
        'Authorization': 'Basic ' + btoa('admin:admin123')
    },
    credentials: 'include'  // 중요!
})

// Axios
axios.get('http://localhost:8080/api/posts', {
    auth: { username: 'admin', password: 'admin123' },
    withCredentials: true  // 중요!
})
```

---

### 4. CSRF 토큰 에러

**증상:**
```json
{
  "timestamp": "2026-01-04T12:00:00.000+00:00",
  "status": 403,
  "error": "Forbidden",
  "message": "Invalid CSRF Token"
}
```

**원인:**
- CSRF 보호가 활성화된 엔드포인트에 토큰 없이 요청

**해결:**
- REST API는 `/api/**` 패턴으로 CSRF 비활성화되어 있음
- 일반 폼 제출 시 CSRF 토큰 포함 필요

---

## 테스트

### 1. 공개 API 테스트 (인증 불필요)
```bash
# 카테고리 목록 조회 - 성공 예상
curl http://localhost:8080/api/categories

# 포스트 목록 조회 - 성공 예상
curl http://localhost:8080/api/posts
```

### 2. 관리 API 테스트 (인증 필요)
```bash
# 인증 없이 포스트 생성 시도 - 401 에러 예상
curl -X POST http://localhost:8080/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}'

# 인증 포함 포스트 생성 - 성공 예상
curl -X POST http://localhost:8080/api/posts \
  -u admin:admin123 \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "main",
    "contentType": "PHOTO",
    "title": "Test Post",
    "year": "2024"
  }'
```

### 3. 관리자 페이지 테스트
```bash
# 인증 없이 접근 - 401 에러 예상
curl http://localhost:8080/admin

# 인증 포함 접근 - HTML 페이지 반환 예상
curl -u admin:admin123 http://localhost:8080/admin
```

---

## 파일 목록

### 새로 추가된 파일
- ✅ `SecurityConfig.java` - Spring Security 설정 클래스

### 수정된 파일
- ✅ `pom.xml` - Spring Security 의존성 추가
- ✅ `application.properties` - 관리자 계정 설정 추가
- ✅ `application-prod.properties` - 프로덕션 보안 설정

---

## 마이그레이션 가이드

### 기존 프론트엔드 코드 수정

**admin.js 수정 예시:**

```javascript
// 기존 코드
async function loadPosts() {
    const response = await fetch('/api/posts');
    const posts = await response.json();
    // ...
}

// 수정 후
async function loadPosts() {
    const response = await fetch('/api/posts', {
        headers: {
            'Authorization': 'Basic ' + btoa('admin:admin123')
        }
    });

    if (response.status === 401) {
        alert('로그인이 필요합니다');
        // 로그인 페이지로 리다이렉트 또는 인증 프롬프트 표시
        return;
    }

    const posts = await response.json();
    // ...
}

// 또는 공통 함수로 추출
async function authenticatedFetch(url, options = {}) {
    const username = localStorage.getItem('admin_username') || 'admin';
    const password = localStorage.getItem('admin_password') || 'admin123';

    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': 'Basic ' + btoa(username + ':' + password)
        }
    });

    if (response.status === 401) {
        // 로그인 실패 처리
        promptLogin();
        throw new Error('Authentication required');
    }

    return response;
}
```

---

## 요약

### ✅ 구현 완료
1. Spring Security 의존성 추가
2. SecurityConfig 클래스 생성
3. HTTP Basic Authentication 설정
4. Role 기반 접근 제어 (ADMIN)
5. CSRF 보호 설정
6. 환경별 관리자 계정 설정

### ⚠️ 주의사항
- 로컬 개발: `admin:admin123` 사용 가능
- 프로덕션: **반드시** 환경 변수로 계정 설정
- HTTPS 사용 권장 (프로덕션 필수)
- 강력한 비밀번호 사용

### 🚀 다음 단계
1. 프론트엔드 인증 처리 추가
2. JWT 토큰 인증 전환 (선택)
3. 데이터베이스 기반 사용자 관리 (선택)
4. MFA 추가 (선택)

---

**작성일**: 2026-01-04
**버전**: 1.0.0

# AWS EC2 빠른 시작 가이드 (10분)

> 💡 **상세 가이드**: 전체 내용은 [AWS_EC2_DEPLOYMENT_GUIDE.md](AWS_EC2_DEPLOYMENT_GUIDE.md) 참조

## 전제 조건
- AWS 계정
- SSH 클라이언트
- 로컬에서 프로젝트를 이미 클론한 상태

---

## 🚀 1단계: EC2 인스턴스 생성 (3분)

### AWS 콘솔에서
```
1. EC2 > Launch Instance
2. 이름: portfolio-server
3. 이미지: Ubuntu Server 22.04 LTS
4. 인스턴스 유형: t2.small (또는 t2.micro 프리티어)
5. 키 페어: 새로 생성 → portfolio-key.pem 다운로드
6. 보안 그룹:
   ✅ SSH (22) - 내 IP
   ✅ HTTP (80) - 모든 곳
   ✅ HTTPS (443) - 모든 곳
7. Launch!
```

### Elastic IP 할당 (권장)
```
EC2 > Elastic IPs > Allocate > Associate to instance
```

**EC2 Public IP 메모**: `________________` (필요함!)

---

## 🔧 2단계: 서버 초기 설정 (3분)

### SSH 접속
```bash
chmod 400 portfolio-key.pem
ssh -i portfolio-key.pem ubuntu@YOUR_EC2_IP
```

### 원클릭 설치 스크립트
```bash
# 시스템 업데이트 및 필수 패키지 설치
sudo apt update && sudo apt upgrade -y && \
sudo apt install -y openjdk-17-jdk mariadb-server nginx git maven

# Java 버전 확인
java -version  # openjdk 17 확인
```

---

## 🗄️ 3단계: 데이터베이스 설정 (2분)

```bash
# MariaDB 보안 설정
sudo mysql_secure_installation
# - Enter (현재 비밀번호 없음)
# - N (unix socket)
# - Y (root 비밀번호 변경) → 안전한 비밀번호 입력!
# - Y, Y, Y, Y (나머지 전부 Yes)

# 데이터베이스 생성
sudo mysql -u root -p
```

**MySQL에서 실행:**
```sql
CREATE DATABASE portfolio_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'portfolio'@'localhost' IDENTIFIED BY 'your_secure_db_password';
GRANT ALL PRIVILEGES ON portfolio_prod.* TO 'portfolio'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 📦 4단계: 애플리케이션 배포 (2분)

### 방법 A: 로컬에서 빌드 후 업로드 (빠름)
```bash
# 로컬 PC에서
cd printPP/webApp/backend
mvn clean package -DskipTests

# JAR 파일을 EC2로 전송
scp -i portfolio-key.pem \
  target/portfolio-backend-1.0.0.jar \
  ubuntu@YOUR_EC2_IP:/home/ubuntu/

# 배포 스크립트 전송
scp -i portfolio-key.pem -r \
  ../../deploy \
  ubuntu@YOUR_EC2_IP:/home/ubuntu/
```

### 방법 B: EC2에서 직접 빌드 (간단)
```bash
# EC2에서
git clone https://github.com/ryu9634/printPP.git
cd printPP/webApp/backend
mvn clean package -DskipTests
```

### 배포 실행
```bash
# EC2에서
# 디렉토리 생성
sudo mkdir -p /opt/portfolio/uploads
sudo mkdir -p /var/log/portfolio

# JAR 파일 복사
sudo cp ~/portfolio-backend-1.0.0.jar /opt/portfolio/
# 또는 Git에서 빌드했다면:
# sudo cp ~/printPP/webApp/backend/target/portfolio-backend-1.0.0.jar /opt/portfolio/

# 권한 설정
sudo chown -R ubuntu:ubuntu /opt/portfolio
```

---

## ⚙️ 5단계: 서비스 설정 및 시작 (2분)

### 환경 변수 설정
```bash
# 환경 변수 디렉토리 생성
sudo mkdir -p /etc/systemd/system/portfolio.service.d

# 환경 변수 파일 생성
sudo nano /etc/systemd/system/portfolio.service.d/override.conf
```

**파일 내용 (자신의 값으로 변경!):**
```ini
[Service]
Environment="ADMIN_USERNAME=admin"
Environment="ADMIN_PASSWORD=your_secure_admin_password"
Environment="DB_PASSWORD=your_secure_db_password"
```

저장: `Ctrl+O` → Enter → `Ctrl+X`

### systemd 서비스 설치
```bash
# 서비스 파일 복사
sudo cp ~/deploy/portfolio.service /etc/systemd/system/

# 서비스 시작
sudo systemctl daemon-reload
sudo systemctl start portfolio
sudo systemctl enable portfolio

# 상태 확인
sudo systemctl status portfolio
```

**✅ 성공하면 "active (running)" 표시**

---

## 🌐 6단계: Nginx 설정 (선택 사항, 1분)

```bash
# Nginx 설정 복사
sudo cp ~/deploy/nginx.conf /etc/nginx/sites-available/portfolio

# YOUR_DOMAIN.com 부분을 EC2 IP로 변경 (도메인 없는 경우)
sudo nano /etc/nginx/sites-available/portfolio
# server_name 줄을 다음으로 변경:
# server_name YOUR_EC2_IP;

# 설정 활성화
sudo ln -s /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # 기본 사이트 제거

# Nginx 재시작
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🎉 완료! 접속 확인

### 브라우저에서 접속
```
메인 페이지:     http://YOUR_EC2_IP
관리자 페이지:   http://YOUR_EC2_IP/admin
```

### 로그인
```
Username: (환경 변수로 설정한 값)
Password: (환경 변수로 설정한 값)
```

---

## 📊 모니터링 및 관리

### 유용한 명령어
```bash
# 서비스 상태 확인
sudo systemctl status portfolio

# 실시간 로그 보기
sudo journalctl -u portfolio -f

# 서비스 재시작
sudo systemctl restart portfolio

# Nginx 로그
tail -f /var/log/nginx/portfolio_access.log
tail -f /var/log/nginx/portfolio_error.log
```

---

## 🔒 보안 (중요!)

### 즉시 해야 할 일
```bash
# 1. SSH 비밀번호 로그인 비활성화
sudo nano /etc/ssh/sshd_config
# PasswordAuthentication no 확인
sudo systemctl restart sshd

# 2. 방화벽 활성화
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status

# 3. 포트 8080 차단 (Nginx 사용 시)
# AWS 보안 그룹에서 8080 포트 규칙 제거
```

---

## ❓ 문제 해결

### 서비스가 시작되지 않음
```bash
# 로그 확인
sudo journalctl -u portfolio -n 100

# 흔한 원인:
# - 환경 변수 오타
# - DB 비밀번호 불일치
# - JAR 파일 경로 오류
```

### 502 Bad Gateway (Nginx)
```bash
# Spring Boot 상태 확인
sudo systemctl status portfolio

# 8080 포트 리스닝 확인
sudo netstat -tlnp | grep 8080
```

### 데이터베이스 연결 실패
```bash
# MariaDB 상태 확인
sudo systemctl status mariadb

# 수동 연결 테스트
mysql -u portfolio -p portfolio_prod
```

---

## 🚀 업데이트 배포

```bash
# 1. 로컬에서 새 JAR 빌드
cd printPP/webApp/backend
mvn clean package -DskipTests

# 2. EC2로 전송
scp -i portfolio-key.pem \
  target/portfolio-backend-1.0.0.jar \
  ubuntu@YOUR_EC2_IP:/home/ubuntu/

# 3. EC2에서 배포
ssh -i portfolio-key.pem ubuntu@YOUR_EC2_IP
sudo cp ~/portfolio-backend-1.0.0.jar /opt/portfolio/
sudo systemctl restart portfolio
```

---

## 📚 추가 리소스

- **상세 가이드**: [AWS_EC2_DEPLOYMENT_GUIDE.md](AWS_EC2_DEPLOYMENT_GUIDE.md)
- **보안 설정**: [SECURITY_SETUP.md](SECURITY_SETUP.md)
- **프로젝트 문서**: [README.md](README.md)

---

## ✅ 체크리스트

배포 후 확인:
- [ ] 메인 페이지 접속 가능
- [ ] 관리자 페이지 로그인 가능
- [ ] 파일 업로드 테스트
- [ ] 로그 정상 출력 확인
- [ ] 서비스 자동 시작 설정 완료
- [ ] 방화벽 설정 완료
- [ ] Nginx 리버스 프록시 동작 확인
- [ ] 환경 변수 올바르게 설정

---

**🎯 목표 달성**: 10분 안에 AWS EC2에 Spring Boot 애플리케이션 배포 완료!

**다음 단계**: SSL 인증서 설치 (HTTPS) - [AWS_EC2_DEPLOYMENT_GUIDE.md](AWS_EC2_DEPLOYMENT_GUIDE.md#ssl-인증서-설정)

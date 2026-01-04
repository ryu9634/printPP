# AWS EC2 배포 가이드

## 목차
1. [사전 준비](#사전-준비)
2. [EC2 인스턴스 생성](#ec2-인스턴스-생성)
3. [서버 환경 설정](#서버-환경-설정)
4. [데이터베이스 설정](#데이터베이스-설정)
5. [애플리케이션 배포](#애플리케이션-배포)
6. [Nginx 설정](#nginx-설정)
7. [SSL 인증서 설정](#ssl-인증서-설정)
8. [모니터링 및 유지보수](#모니터링-및-유지보수)

---

## 사전 준비

### 필요한 것들
- [ ] AWS 계정
- [ ] 도메인 (선택 사항, 있으면 좋음)
- [ ] SSH 클라이언트 (Windows: PuTTY or Windows Terminal)
- [ ] 로컬에서 빌드된 JAR 파일

### 예상 비용
- **EC2 t2.micro** (프리티어): 무료 (12개월) 또는 ~$10/월
- **RDS MariaDB t3.micro**: ~$15/월
- **도메인**: ~$12/년
- **총 예상 비용**: ~$25-30/월 (프리티어 제외 시)

---

## EC2 인스턴스 생성

### 1. AWS 콘솔 접속
1. https://console.aws.amazon.com 접속
2. 리전 선택 (예: 서울 - ap-northeast-2)
3. EC2 대시보드로 이동

### 2. 인스턴스 시작
```
[Launch Instance] 버튼 클릭

이름: portfolio-server

이미지 선택:
  - Ubuntu Server 22.04 LTS (HVM), SSD Volume Type

인스턴스 유형:
  - t2.small 권장 (2 vCPU, 2GB RAM)
  - 또는 t2.micro (프리티어, 1 vCPU, 1GB RAM - 최소 사양)

키 페어:
  - [Create new key pair]
  - 이름: portfolio-key
  - 유형: RSA
  - 형식: .pem (Linux/Mac) 또는 .ppk (Windows/PuTTY)
  - 다운로드 후 안전한 곳에 보관!

네트워크 설정:
  ✅ SSH (포트 22) - 내 IP
  ✅ HTTP (포트 80) - 모든 곳 (0.0.0.0/0)
  ✅ HTTPS (포트 443) - 모든 곳 (0.0.0.0/0)
  ✅ Custom TCP (포트 8080) - 모든 곳 (임시, 나중에 제거)

스토리지:
  - 20 GB gp3 (기본값 8GB보다 여유 있게)

[Launch instance] 클릭
```

### 3. Elastic IP 할당 (권장)
```
EC2 > Elastic IPs > Allocate Elastic IP address

생성 후:
  - [Actions] > [Associate Elastic IP address]
  - 인스턴스 선택: portfolio-server
  - [Associate]
```

**이유**: 인스턴스 재시작 시 IP 변경 방지

---

## 서버 환경 설정

### 1. SSH 접속

#### Linux/Mac
```bash
chmod 400 portfolio-key.pem
ssh -i portfolio-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

#### Windows (PowerShell)
```powershell
ssh -i portfolio-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### 2. 시스템 업데이트
```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Java 17 설치
```bash
# OpenJDK 17 설치
sudo apt install openjdk-17-jdk -y

# 설치 확인
java -version
# 출력: openjdk version "17.x.x"
```

### 4. Maven 설치 (빌드 시 필요한 경우)
```bash
sudo apt install maven -y
mvn -version
```

### 5. MariaDB 설치
```bash
# MariaDB 서버 설치
sudo apt install mariadb-server -y

# MariaDB 보안 설정
sudo mysql_secure_installation

# 설정 내용:
# - Enter current password for root: (엔터)
# - Switch to unix_socket authentication: N
# - Change the root password: Y
#   - 새 비밀번호 입력: your_secure_password
# - Remove anonymous users: Y
# - Disallow root login remotely: Y
# - Remove test database: Y
# - Reload privilege tables: Y

# MariaDB 접속 테스트
sudo mysql -u root -p
```

### 6. Nginx 설치
```bash
sudo apt install nginx -y

# 시작 및 자동 시작 설정
sudo systemctl start nginx
sudo systemctl enable nginx

# 상태 확인
sudo systemctl status nginx
```

---

## 데이터베이스 설정

### 1. 데이터베이스 및 사용자 생성
```sql
-- MariaDB 접속
sudo mysql -u root -p

-- 데이터베이스 생성
CREATE DATABASE portfolio_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 사용자 생성 및 권한 부여
CREATE USER 'portfolio'@'localhost' IDENTIFIED BY 'your_db_password';
GRANT ALL PRIVILEGES ON portfolio_prod.* TO 'portfolio'@'localhost';
FLUSH PRIVILEGES;

-- 확인
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User='portfolio';

-- 종료
EXIT;
```

### 2. 연결 테스트
```bash
mysql -u portfolio -p portfolio_prod
# 비밀번호 입력 후 접속 성공하면 OK
```

---

## 애플리케이션 배포

### 방법 1: 로컬에서 빌드 후 업로드 (권장)

#### 1. 로컬에서 JAR 빌드
```bash
# 프로젝트 디렉토리에서
cd printPP/webApp/backend
mvn clean package -DskipTests

# 빌드 완료 확인
ls -lh target/portfolio-backend-1.0.0.jar
```

#### 2. EC2로 파일 전송
```bash
# Linux/Mac
scp -i portfolio-key.pem \
  target/portfolio-backend-1.0.0.jar \
  ubuntu@YOUR_EC2_IP:/home/ubuntu/

# Windows (PowerShell)
scp -i portfolio-key.pem `
  target/portfolio-backend-1.0.0.jar `
  ubuntu@YOUR_EC2_IP:/home/ubuntu/
```

#### 3. 배포 스크립트 전송
```bash
scp -i portfolio-key.pem -r deploy/* ubuntu@YOUR_EC2_IP:/home/ubuntu/
```

### 방법 2: EC2에서 직접 빌드

#### 1. Git 저장소 클론
```bash
ssh -i portfolio-key.pem ubuntu@YOUR_EC2_IP

# Git 설치
sudo apt install git -y

# 프로젝트 클론
git clone https://github.com/ryu9634/printPP.git
cd printPP/webApp/backend

# 빌드
mvn clean package -DskipTests
```

### 배포 디렉토리 설정

```bash
# 배포 디렉토리 생성
sudo mkdir -p /opt/portfolio
sudo mkdir -p /opt/portfolio/uploads
sudo mkdir -p /var/log/portfolio

# JAR 파일 복사
sudo cp ~/portfolio-backend-1.0.0.jar /opt/portfolio/

# 또는 Git에서 빌드한 경우
sudo cp ~/printPP/webApp/backend/target/portfolio-backend-1.0.0.jar /opt/portfolio/

# 권한 설정
sudo chown -R ubuntu:ubuntu /opt/portfolio
sudo chmod 755 /opt/portfolio/portfolio-backend-1.0.0.jar
```

---

## Systemd 서비스 설정

### 1. 환경 변수 설정
```bash
# 환경 변수 파일 생성
sudo mkdir -p /etc/systemd/system/portfolio.service.d
sudo nano /etc/systemd/system/portfolio.service.d/override.conf
```

**파일 내용:**
```ini
[Service]
Environment="ADMIN_USERNAME=your_admin_username"
Environment="ADMIN_PASSWORD=your_secure_admin_password"
Environment="DB_PASSWORD=your_db_password"
```

저장: `Ctrl+O`, Enter, `Ctrl+X`

### 2. 서비스 파일 설치
```bash
# 서비스 파일 복사
sudo cp ~/portfolio.service /etc/systemd/system/

# 또는 직접 생성
sudo nano /etc/systemd/system/portfolio.service
```

**파일 내용** (`deploy/portfolio.service` 참조)

### 3. 서비스 시작
```bash
# 서비스 데몬 리로드
sudo systemctl daemon-reload

# 서비스 시작
sudo systemctl start portfolio

# 부팅 시 자동 시작 설정
sudo systemctl enable portfolio

# 상태 확인
sudo systemctl status portfolio
```

### 4. 로그 확인
```bash
# 실시간 로그 보기
sudo journalctl -u portfolio -f

# 최근 100줄 보기
sudo journalctl -u portfolio -n 100

# 오늘 로그만 보기
sudo journalctl -u portfolio --since today
```

---

## Nginx 설정

### 1. Nginx 설정 파일 생성
```bash
sudo nano /etc/nginx/sites-available/portfolio
```

**파일 내용** (`deploy/nginx.conf` 참조)

**중요**: `YOUR_DOMAIN.com`을 실제 도메인으로 변경하거나, 도메인이 없으면 EC2 IP 사용

### 2. 설정 활성화
```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/

# 기본 사이트 비활성화 (선택 사항)
sudo rm /etc/nginx/sites-enabled/default

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

### 3. 방화벽 설정 (선택 사항)
```bash
# UFW 방화벽 활성화
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# 상태 확인
sudo ufw status
```

---

## SSL 인증서 설정 (HTTPS)

### 도메인이 있는 경우 (Let's Encrypt - 무료)

#### 1. Certbot 설치
```bash
sudo apt install certbot python3-certbot-nginx -y
```

#### 2. SSL 인증서 발급
```bash
# Nginx용 자동 설정
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 이메일 입력
# 약관 동의: Y
# 이메일 공유: N (선택)
# HTTP to HTTPS 리다이렉트: 2 (권장)
```

#### 3. 자동 갱신 설정
```bash
# 갱신 테스트
sudo certbot renew --dry-run

# Cron으로 자동 갱신 (이미 설정되어 있음)
sudo systemctl status certbot.timer
```

### 도메인이 없는 경우 (자체 서명 인증서 - 개발용)

```bash
# 인증서 생성
sudo mkdir /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/portfolio.key \
  -out /etc/nginx/ssl/portfolio.crt

# Nginx 설정 수정 필요
# ssl_certificate /etc/nginx/ssl/portfolio.crt;
# ssl_certificate_key /etc/nginx/ssl/portfolio.key;
```

---

## 접속 확인

### 1. 브라우저에서 확인
```
HTTP:  http://YOUR_EC2_IP  (또는 http://yourdomain.com)
HTTPS: https://yourdomain.com (SSL 설정 후)

관리자 페이지: http://YOUR_EC2_IP/admin
```

### 2. 로그인 테스트
- Username: (환경 변수로 설정한 값)
- Password: (환경 변수로 설정한 값)

---

## 모니터링 및 유지보수

### 1. 서비스 관리 명령어

```bash
# 서비스 상태 확인
sudo systemctl status portfolio

# 서비스 재시작
sudo systemctl restart portfolio

# 서비스 중지
sudo systemctl stop portfolio

# 서비스 시작
sudo systemctl start portfolio

# 로그 보기
sudo journalctl -u portfolio -f
```

### 2. 로그 파일 위치
```bash
# 애플리케이션 로그
sudo journalctl -u portfolio

# Nginx 액세스 로그
tail -f /var/log/nginx/portfolio_access.log

# Nginx 에러 로그
tail -f /var/log/nginx/portfolio_error.log

# MariaDB 로그
sudo tail -f /var/log/mysql/error.log
```

### 3. 디스크 사용량 확인
```bash
# 전체 디스크 사용량
df -h

# 업로드 폴더 크기
du -sh /opt/portfolio/uploads

# 로그 폴더 크기
du -sh /var/log
```

### 4. 로그 로테이션 설정
```bash
# logrotate 설정
sudo nano /etc/logrotate.d/portfolio
```

**파일 내용:**
```
/var/log/portfolio/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
}
```

### 5. 자동 백업 스크립트

```bash
# 백업 스크립트 생성
sudo nano /opt/portfolio/backup.sh
```

**파일 내용:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/portfolio/backups"

mkdir -p $BACKUP_DIR

# 데이터베이스 백업
mysqldump -u portfolio -p'your_db_password' portfolio_prod > $BACKUP_DIR/db_$DATE.sql

# 업로드 파일 백업
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /opt/portfolio/uploads

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# 실행 권한 부여
sudo chmod +x /opt/portfolio/backup.sh

# Cron으로 매일 자동 백업 (새벽 2시)
crontab -e
# 추가: 0 2 * * * /opt/portfolio/backup.sh >> /var/log/portfolio/backup.log 2>&1
```

---

## 업데이트 배포

### 자동 배포 스크립트 사용

```bash
# 배포 스크립트 실행
cd /home/ubuntu
chmod +x deploy.sh
./deploy.sh
```

### 수동 배포

```bash
# 1. 새 JAR 파일을 EC2로 전송
scp -i portfolio-key.pem \
  target/portfolio-backend-1.0.0.jar \
  ubuntu@YOUR_EC2_IP:/home/ubuntu/

# 2. EC2에서 배포
ssh -i portfolio-key.pem ubuntu@YOUR_EC2_IP

# 기존 JAR 백업
sudo cp /opt/portfolio/portfolio-backend-1.0.0.jar \
  /opt/portfolio/backups/portfolio-backend-$(date +%Y%m%d_%H%M%S).jar

# 새 JAR 복사
sudo cp ~/portfolio-backend-1.0.0.jar /opt/portfolio/

# 서비스 재시작
sudo systemctl restart portfolio

# 상태 확인
sudo systemctl status portfolio
```

---

## 문제 해결

### 1. 서비스가 시작되지 않음

```bash
# 로그 확인
sudo journalctl -u portfolio -n 100

# 일반적인 원인:
# - JAR 파일 경로 오류
# - 환경 변수 미설정
# - 포트 충돌 (8080 포트가 이미 사용 중)

# 포트 사용 확인
sudo lsof -i :8080
```

### 2. 데이터베이스 연결 실패

```bash
# MariaDB 상태 확인
sudo systemctl status mariadb

# 연결 테스트
mysql -u portfolio -p portfolio_prod

# 환경 변수 확인
sudo cat /etc/systemd/system/portfolio.service.d/override.conf
```

### 3. Nginx 502 Bad Gateway

```bash
# Spring Boot 애플리케이션 상태 확인
sudo systemctl status portfolio

# 포트 리스닝 확인
sudo netstat -tlnp | grep 8080

# Nginx 에러 로그
sudo tail -f /var/log/nginx/portfolio_error.log
```

### 4. 업로드 파일이 표시되지 않음

```bash
# 업로드 디렉토리 권한 확인
ls -la /opt/portfolio/uploads

# 권한 수정
sudo chmod -R 755 /opt/portfolio/uploads
sudo chown -R ubuntu:ubuntu /opt/portfolio/uploads
```

---

## 보안 체크리스트

### 필수 보안 설정
- [ ] SSH 키 기반 인증 사용 (비밀번호 로그인 비활성화)
- [ ] 방화벽 설정 (UFW 활성화)
- [ ] 관리자 계정 강력한 비밀번호 사용
- [ ] 데이터베이스 비밀번호 강력하게 설정
- [ ] HTTPS 사용 (SSL 인증서 설치)
- [ ] 환경 변수로 민감한 정보 관리
- [ ] 정기적인 시스템 업데이트
- [ ] 백업 자동화 설정

### 추가 권장 사항
- [ ] Fail2ban 설치 (brute force 공격 방지)
- [ ] CloudWatch 또는 외부 모니터링 도구 설정
- [ ] AWS Security Groups 최소 권한 설정
- [ ] IAM 역할 사용 (Access Key 대신)

---

## 비용 절감 팁

1. **프리티어 활용**
   - t2.micro (750시간/월 무료, 12개월)
   - 30GB EBS 스토리지 무료

2. **Reserved Instances**
   - 1년 또는 3년 약정 시 최대 75% 할인

3. **Stop 인스턴스 (개발 환경)**
   - 사용하지 않을 때 인스턴스 중지
   - 컴퓨팅 비용 절감 (스토리지 비용은 유지)

4. **CloudWatch 알람 설정**
   - 비용 초과 시 알람
   - 예산: $10/월 설정 권장

---

## 유용한 링크

- [AWS EC2 프리티어](https://aws.amazon.com/free/)
- [Spring Boot 배포 가이드](https://docs.spring.io/spring-boot/docs/current/reference/html/deployment.html)
- [Nginx 공식 문서](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [MariaDB 문서](https://mariadb.com/kb/en/documentation/)

---

## 요약

### 배포 순서 요약
1. EC2 인스턴스 생성 및 Elastic IP 할당
2. Java, MariaDB, Nginx 설치
3. 데이터베이스 및 사용자 생성
4. JAR 파일 빌드 및 전송
5. Systemd 서비스 설정
6. Nginx 리버스 프록시 설정
7. SSL 인증서 설정 (선택)
8. 모니터링 및 백업 설정

### 주요 명령어
```bash
# 서비스 관리
sudo systemctl restart portfolio
sudo systemctl status portfolio
sudo journalctl -u portfolio -f

# Nginx 관리
sudo systemctl restart nginx
sudo nginx -t

# 데이터베이스
mysql -u portfolio -p portfolio_prod

# 배포
./deploy.sh
```

---

**작성일**: 2026-01-04
**프로젝트**: printPP Portfolio Management System
**대상**: AWS EC2 Ubuntu 22.04 LTS

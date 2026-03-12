# 서버 유지보수 가이드

## 1. 서버 접속 (SSH)

```bash
ssh -i /Users/ryu/Downloads/profileJ.pem -o StrictHostKeyChecking=no ubuntu@13.54.153.158
```

## 2. 로컬 빌드 & 배포

```bash
# 1) 로컬에서 JAR 빌드
export JAVA_HOME=$(brew --prefix openjdk@17) && export PATH="$JAVA_HOME/bin:$PATH"
cd /Users/ryu/Desktop/PJ_jeung/printPP
mvn clean package -DskipTests

# 2) JAR 서버로 전송
scp -i /Users/ryu/Downloads/profileJ.pem target/portfolio-backend-1.0.0.jar ubuntu@13.54.153.158:/tmp/

# 3) 서버에서 배포 & 재시작
ssh -i /Users/ryu/Downloads/profileJ.pem ubuntu@13.54.153.158
sudo cp /tmp/portfolio-backend-1.0.0.jar /opt/portfolio/
sudo systemctl restart portfolio
```

## 3. 서버 관리 명령어 (SSH 접속 후)

```bash
# 앱 상태 확인
sudo systemctl status portfolio

# 앱 재시작 / 중지 / 시작
sudo systemctl restart portfolio
sudo systemctl stop portfolio
sudo systemctl start portfolio

# 앱 로그 보기 (실시간)
sudo journalctl -u portfolio -f

# 앱 로그 보기 (최근 100줄)
sudo journalctl -u portfolio -n 100

# Nginx 상태 / 재시작
sudo systemctl status nginx
sudo systemctl reload nginx

# MariaDB 상태 / 재시작
sudo systemctl status mariadb
sudo systemctl restart mariadb

# DB 접속
sudo mariadb -u portfolio -p portfolio_prod
# 비밀번호: Portfolio2026!Secure
```

## 4. 주요 파일 위치 (서버)

| 항목 | 경로 |
|------|------|
| JAR 파일 | `/opt/portfolio/portfolio-backend-1.0.0.jar` |
| 서비스 설정 | `/etc/systemd/system/portfolio.service` |
| 환경변수(비밀번호) | `/etc/systemd/system/portfolio.service.d/override.conf` |
| Nginx 설정 | `/etc/nginx/sites-available/portfolio` |
| MariaDB 설정 | `/etc/mysql/mariadb.conf.d/50-server.cnf` |

## 5. 접속 정보

| 항목 | 값 |
|------|-----|
| **도메인** | https://jaehoonjeong.com |
| **서버 IP** | 13.54.153.158 (Elastic IP) |
| **SSH 키** | `/Users/ryu/Downloads/profileJ.pem` |
| **SSH 유저** | `ubuntu` |
| **DB 호스트** | 13.54.153.158:3306 |
| **DB 이름** | `portfolio_prod` |
| **DB 유저** | `portfolio` |
| **DB 비밀번호** | `Portfolio2026!Secure` |
| **관리자 ID** | `admin` |
| **관리자 비밀번호** | `Admin2026!Secure` |
| **SSL** | Cloudflare Flexible |

## 6. 코드 수정 후 배포 (한줄 명령어)

```bash
export JAVA_HOME=$(brew --prefix openjdk@17) && export PATH="$JAVA_HOME/bin:$PATH" && cd /Users/ryu/Desktop/PJ_jeung/printPP && mvn clean package -DskipTests && scp -i /Users/ryu/Downloads/profileJ.pem target/portfolio-backend-1.0.0.jar ubuntu@13.54.153.158:/tmp/ && ssh -i /Users/ryu/Downloads/profileJ.pem ubuntu@13.54.153.158 "sudo cp /tmp/portfolio-backend-1.0.0.jar /opt/portfolio/ && sudo systemctl restart portfolio && echo '배포 완료!'"
```

## 7. 인스턴스 중지/시작 시 주의사항

- Elastic IP를 연결해두었으므로 인스턴스 재시작해도 IP 유지됨
- 인스턴스 **종료(Terminate)**하면 데이터 삭제되니 주의 (중지만 할 것)
- t3.micro (1GB RAM) → 서버에서 Maven 빌드 금지 (OOM 발생), 반드시 로컬 빌드 후 JAR 전송

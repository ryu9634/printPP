#!/bin/bash

###############################################################################
# AWS EC2 배포 스크립트
# Spring Boot 애플리케이션을 EC2 인스턴스에 배포합니다.
###############################################################################

set -e  # 에러 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 설정
APP_NAME="portfolio-backend"
APP_VERSION="1.0.0"
JAR_NAME="${APP_NAME}-${APP_VERSION}.jar"
DEPLOY_DIR="/opt/portfolio"
BACKUP_DIR="${DEPLOY_DIR}/backups"
LOG_DIR="/var/log/portfolio"

log_info "=== AWS EC2 배포 시작 ==="

# 1. 사전 확인
log_info "1. 환경 확인 중..."

if [ ! -f "../pom.xml" ]; then
    log_error "pom.xml을 찾을 수 없습니다. 올바른 디렉토리에서 실행하세요."
    exit 1
fi

# 2. Maven 빌드
log_info "2. Maven 빌드 시작..."
cd ..

if ! mvn clean package -DskipTests; then
    log_error "Maven 빌드 실패"
    exit 1
fi

if [ ! -f "target/${JAR_NAME}" ]; then
    log_error "JAR 파일이 생성되지 않았습니다: target/${JAR_NAME}"
    exit 1
fi

log_info "빌드 성공: target/${JAR_NAME}"

# 3. 디렉토리 생성
log_info "3. 배포 디렉토리 생성..."
sudo mkdir -p ${DEPLOY_DIR}
sudo mkdir -p ${BACKUP_DIR}
sudo mkdir -p ${LOG_DIR}
sudo mkdir -p ${DEPLOY_DIR}/uploads

# 4. 기존 JAR 백업
if [ -f "${DEPLOY_DIR}/${JAR_NAME}" ]; then
    log_info "4. 기존 JAR 파일 백업..."
    BACKUP_FILE="${BACKUP_DIR}/${JAR_NAME}.$(date +%Y%m%d_%H%M%S)"
    sudo cp ${DEPLOY_DIR}/${JAR_NAME} ${BACKUP_FILE}
    log_info "백업 완료: ${BACKUP_FILE}"
else
    log_info "4. 기존 JAR 파일 없음 (최초 배포)"
fi

# 5. 새 JAR 파일 복사
log_info "5. 새 JAR 파일 배포..."
sudo cp target/${JAR_NAME} ${DEPLOY_DIR}/

# 6. 권한 설정
log_info "6. 파일 권한 설정..."
sudo chown -R $USER:$USER ${DEPLOY_DIR}
sudo chmod 755 ${DEPLOY_DIR}/${JAR_NAME}
sudo chmod -R 755 ${DEPLOY_DIR}/uploads

# 7. 환경 변수 확인
log_info "7. 환경 변수 확인..."
if [ -z "$ADMIN_USERNAME" ] || [ -z "$ADMIN_PASSWORD" ]; then
    log_warn "관리자 계정 환경 변수가 설정되지 않았습니다!"
    log_warn "다음 명령어로 설정하세요:"
    log_warn "  export ADMIN_USERNAME=your_username"
    log_warn "  export ADMIN_PASSWORD=your_password"
fi

if [ -z "$DB_PASSWORD" ]; then
    log_warn "데이터베이스 비밀번호 환경 변수가 설정되지 않았습니다!"
    log_warn "  export DB_PASSWORD=your_db_password"
fi

# 8. 애플리케이션 재시작
log_info "8. 애플리케이션 재시작..."

# systemd 서비스 사용 시
if systemctl is-active --quiet portfolio; then
    log_info "기존 서비스 중지 중..."
    sudo systemctl stop portfolio
fi

log_info "서비스 시작 중..."
sudo systemctl start portfolio
sudo systemctl enable portfolio

# 9. 상태 확인
log_info "9. 배포 상태 확인..."
sleep 5

if systemctl is-active --quiet portfolio; then
    log_info "✅ 애플리케이션이 성공적으로 시작되었습니다!"
    log_info "서비스 상태:"
    sudo systemctl status portfolio --no-pager
else
    log_error "❌ 애플리케이션 시작 실패"
    log_error "로그 확인:"
    sudo journalctl -u portfolio -n 50 --no-pager
    exit 1
fi

# 10. 로그 확인 안내
log_info ""
log_info "=== 배포 완료 ==="
log_info ""
log_info "📋 유용한 명령어:"
log_info "  서비스 상태:    sudo systemctl status portfolio"
log_info "  로그 확인:      sudo journalctl -u portfolio -f"
log_info "  서비스 재시작:  sudo systemctl restart portfolio"
log_info "  서비스 중지:    sudo systemctl stop portfolio"
log_info ""
log_info "🌐 접속 정보:"
log_info "  애플리케이션: http://YOUR_EC2_IP:8080"
log_info "  관리자 페이지: http://YOUR_EC2_IP:8080/admin"
log_info ""

cd deploy

#!/bin/bash

# 포트폴리오 배포 스크립트
# 사용법: ./deploy.sh

set -e

# 설정
PROJECT_DIR="/Users/ryu/Desktop/PJ_jeung/printPP"
PEM_KEY="/Users/ryu/Downloads/profileJ.pem"
SERVER="ubuntu@13.54.153.158"
JAR_NAME="portfolio-backend-1.0.0.jar"

# Java 17 설정
export JAVA_HOME=$(brew --prefix openjdk@17)
export PATH="$JAVA_HOME/bin:$PATH"

echo "========================================="
echo "  포트폴리오 배포 시작"
echo "========================================="

# 1. 빌드
echo ""
echo "[1/3] Maven 빌드 중..."
cd "$PROJECT_DIR"
mvn clean package -DskipTests -q
echo "  -> 빌드 완료!"

# 2. JAR 전송
echo ""
echo "[2/3] JAR 서버 전송 중..."
scp -i "$PEM_KEY" -o StrictHostKeyChecking=no "target/$JAR_NAME" "$SERVER:/tmp/"
echo "  -> 전송 완료!"

# 3. 서버 배포 & 재시작
echo ""
echo "[3/3] 서버 배포 및 재시작 중..."
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no "$SERVER" \
  "sudo cp /tmp/$JAR_NAME /opt/portfolio/ && sudo systemctl restart portfolio"
echo "  -> 재시작 완료!"

echo ""
echo "========================================="
echo "  배포 완료! https://jaehoonjeong.com"
echo "========================================="

package com.portfolio.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path fileStorageLocation;

    public FileStorageService(@Value("${file.upload-dir}") String uploadDir) {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();

        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("파일 저장 디렉토리를 생성할 수 없습니다.", ex);
        }
    }

    /**
     * 파일을 저장하고 UUID 기반의 고유한 파일명을 반환합니다.
     *
     * @param file 업로드할 MultipartFile
     * @return 저장된 파일의 고유한 파일명 (UUID + 확장자)
     * @throws RuntimeException 파일명이 유효하지 않거나 저장에 실패한 경우
     */
    public String storeFile(MultipartFile file) {
        // 파일명 정리 및 검증
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());

        try {
            // 파일명에 유효하지 않은 문자가 있는지 확인 (경로 탐색 공격 방지)
            if (originalFileName.contains("..")) {
                throw new RuntimeException("유효하지 않은 파일명입니다: " + originalFileName);
            }

            // 빈 파일 체크
            if (file.isEmpty()) {
                throw new RuntimeException("빈 파일은 저장할 수 없습니다: " + originalFileName);
            }

            // 고유한 파일명 생성 (UUID + 원본 확장자)
            String fileExtension = "";
            if (originalFileName.contains(".")) {
                fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
            }
            String fileName = UUID.randomUUID().toString() + fileExtension;

            // 파일 저장
            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return fileName;
        } catch (IOException ex) {
            throw new RuntimeException("파일을 저장할 수 없습니다: " + originalFileName, ex);
        }
    }

    /**
     * 저장된 파일을 삭제합니다.
     *
     * @param fileName 삭제할 파일명
     * @throws RuntimeException 파일 삭제에 실패한 경우
     */
    public void deleteFile(String fileName) {
        if (fileName == null || fileName.trim().isEmpty()) {
            return; // 빈 파일명은 무시
        }

        try {
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();

            // 보안: 파일 경로가 저장소 디렉토리 내부에 있는지 확인
            if (!filePath.startsWith(this.fileStorageLocation)) {
                throw new RuntimeException("접근이 거부되었습니다: " + fileName);
            }

            Files.deleteIfExists(filePath);
        } catch (IOException ex) {
            throw new RuntimeException("파일을 삭제할 수 없습니다: " + fileName, ex);
        }
    }

    /**
     * 여러 파일을 삭제합니다.
     *
     * @param fileNames 삭제할 파일명 목록
     */
    public void deleteFiles(Iterable<String> fileNames) {
        if (fileNames == null) {
            return;
        }

        for (String fileName : fileNames) {
            deleteFile(fileName);
        }
    }

    /**
     * 파일 저장소의 경로를 반환합니다.
     *
     * @return 파일 저장소 Path 객체
     */
    public Path getFileStorageLocation() {
        return fileStorageLocation;
    }
}

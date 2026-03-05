package com.portfolio.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
            "application/pdf"
    );

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
            ".pdf"
    );

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    private final Path fileStorageLocation;

    public FileStorageService(@Value("${file.upload-dir}") String uploadDir) {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();

        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("파일 저장 디렉토리를 생성할 수 없습니다.", ex);
        }
    }

    public String storeFile(MultipartFile file) {
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());

        try {
            if (originalFileName.contains("..")) {
                throw new RuntimeException("유효하지 않은 파일명입니다: " + originalFileName);
            }

            if (file.isEmpty()) {
                throw new RuntimeException("빈 파일은 저장할 수 없습니다: " + originalFileName);
            }

            if (file.getSize() > MAX_FILE_SIZE) {
                throw new RuntimeException("파일 크기가 10MB를 초과합니다: " + originalFileName);
            }

            String fileExtension = "";
            if (originalFileName.contains(".")) {
                fileExtension = originalFileName.substring(originalFileName.lastIndexOf(".")).toLowerCase();
            }
            if (!ALLOWED_EXTENSIONS.contains(fileExtension)) {
                throw new RuntimeException("허용되지 않는 파일 형식입니다: " + fileExtension);
            }

            String mimeType = file.getContentType();
            if (mimeType == null || !ALLOWED_MIME_TYPES.contains(mimeType)) {
                throw new RuntimeException("허용되지 않는 파일 타입입니다: " + mimeType);
            }

            String fileName = UUID.randomUUID().toString() + fileExtension;
            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            log.info("파일 저장 완료: {} -> {}", originalFileName, fileName);
            return fileName;
        } catch (IOException ex) {
            log.error("파일 저장 실패: {}", originalFileName, ex);
            throw new RuntimeException("파일을 저장할 수 없습니다: " + originalFileName, ex);
        }
    }

    public void deleteFile(String fileName) {
        if (fileName == null || fileName.trim().isEmpty()) {
            return;
        }

        try {
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();

            if (!filePath.startsWith(this.fileStorageLocation)) {
                throw new RuntimeException("접근이 거부되었습니다: " + fileName);
            }

            Files.deleteIfExists(filePath);
            log.info("파일 삭제 완료: {}", fileName);
        } catch (IOException ex) {
            log.error("파일 삭제 실패: {}", fileName, ex);
            throw new RuntimeException("파일을 삭제할 수 없습니다: " + fileName, ex);
        }
    }

    public void deleteFiles(Iterable<String> fileNames) {
        if (fileNames == null) {
            return;
        }

        for (String fileName : fileNames) {
            deleteFile(fileName);
        }
    }

    public Path getFileStorageLocation() {
        return fileStorageLocation;
    }
}

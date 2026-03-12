package com.portfolio.controller;

import com.portfolio.dto.SiteSettingsRequest;
import com.portfolio.model.SiteSettings;
import com.portfolio.service.SiteSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SiteSettingsController {

    private final SiteSettingsService siteSettingsService;

    @GetMapping
    public ResponseEntity<SiteSettings> getSettings() {
        return ResponseEntity.ok(siteSettingsService.getSettings());
    }

    @PostMapping
    public ResponseEntity<SiteSettings> updateSettings(@RequestBody SiteSettingsRequest request) {
        SiteSettings updated = siteSettingsService.updateSettings(request);
        return ResponseEntity.ok(updated);
    }
}

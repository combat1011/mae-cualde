package com.mae.cualde.controller;

import com.mae.cualde.model.*;
import com.mae.cualde.service.MaeService;
import com.mae.cualde.service.MemoryService;
import com.mae.cualde.service.MemoryService.MemoryEntry;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class MaeController {

    private final MaeService maeService;
    private final MemoryService memoryService;

    public MaeController(MaeService maeService, MemoryService memoryService) {
        this.maeService = maeService;
        this.memoryService = memoryService;
    }

    @GetMapping("/state")
    public ResponseEntity<StateResponse> getState() {
        return ResponseEntity.ok(maeService.getState());
    }

    @PostMapping("/command")
    public ResponseEntity<Void> command(@RequestBody CommandRequest request) {
        maeService.processCommand(request.input());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/goldcode")
    public ResponseEntity<Void> goldCode(@RequestBody GoldCodeRequest request) {
        maeService.processGoldCode(request.code());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/echo/{state}")
    public ResponseEntity<Void> setEchoState(@PathVariable String state) {
        try {
            maeService.setEchoState(EchoState.valueOf(state.toUpperCase()));
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/ool/{phase}")
    public ResponseEntity<Void> setOolPhase(@PathVariable String phase) {
        try {
            maeService.setOolPhase(OolPhase.valueOf(phase.toUpperCase()));
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/memory")
    public ResponseEntity<Map<String, MemoryEntry>> getMemories() {
        return ResponseEntity.ok(memoryService.getAll());
    }

    @PostMapping("/memory")
    public ResponseEntity<Void> remember(@RequestBody Map<String, String> body) {
        String key = body.get("key");
        String value = body.get("value");
        String category = body.getOrDefault("category", "user");
        if (key == null || value == null) return ResponseEntity.badRequest().build();
        memoryService.remember(key, value, category);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/memory/{key}")
    public ResponseEntity<Void> forget(@PathVariable String key) {
        memoryService.forget(key);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/memory/session")
    public ResponseEntity<Void> clearSession() {
        memoryService.clearSession();
        return ResponseEntity.ok().build();
    }

    @GetMapping("/intel")
    public ResponseEntity<Map<String, String>> getIntel() {
        return ResponseEntity.ok(Map.of("mode", maeService.getIntelligenceMode().name()));
    }

    @PostMapping("/intel/{mode}")
    public ResponseEntity<Void> setIntel(@PathVariable String mode) {
        try {
            maeService.setIntelligenceMode(IntelligenceMode.valueOf(mode.toUpperCase()));
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}

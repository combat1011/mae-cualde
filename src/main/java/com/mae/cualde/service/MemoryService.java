package com.mae.cualde.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class MemoryService {

    private static final String MEMORY_FILE = "mae-memory.json";
    private static final int MAX_SESSION_MESSAGES = 40;

    private final ObjectMapper objectMapper;
    private final List<Map<String, String>> sessionHistory = new CopyOnWriteArrayList<>();
    private final Map<String, MemoryEntry> persistentMemory = new ConcurrentHashMap<>();

    public MemoryService() {
        this.objectMapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
    }

    @PostConstruct
    public void init() {
        loadFromDisk();
    }

    // ── Session Memory (conversation context) ──────────────────

    public void addUserMessage(String content) {
        sessionHistory.add(Map.of("role", "user", "content", content));
        trimSession();
    }

    public void addAssistantMessage(String content) {
        sessionHistory.add(Map.of("role", "assistant", "content", content));
        trimSession();
    }

    public List<Map<String, String>> getSessionHistory() {
        return Collections.unmodifiableList(sessionHistory);
    }

    public void clearSession() {
        sessionHistory.clear();
    }

    private void trimSession() {
        while (sessionHistory.size() > MAX_SESSION_MESSAGES) {
            sessionHistory.remove(0);
        }
    }

    // ── Persistent Memory (survives restarts) ──────────────────

    public void remember(String key, String value, String category) {
        MemoryEntry entry = new MemoryEntry(key, value, category, Instant.now().toString());
        persistentMemory.put(key, entry);
        saveToDisk();
    }

    public void forget(String key) {
        persistentMemory.remove(key);
        saveToDisk();
    }

    public Map<String, MemoryEntry> getAll() {
        return Collections.unmodifiableMap(persistentMemory);
    }

    public String getMemorySummary() {
        if (persistentMemory.isEmpty()) {
            return "No persistent memories stored.";
        }
        StringBuilder sb = new StringBuilder();
        persistentMemory.forEach((k, v) -> {
            sb.append("  — [").append(v.category()).append("] ")
              .append(k).append(": ").append(v.value()).append("\n");
        });
        return sb.toString().trim();
    }

    // ── Disk persistence ───────────────────────────────────────

    private void saveToDisk() {
        try {
            objectMapper.writeValue(new File(MEMORY_FILE), persistentMemory);
        } catch (IOException e) {
            System.err.println("[MAE] Failed to save memory: " + e.getMessage());
        }
    }

    private void loadFromDisk() {
        File file = new File(MEMORY_FILE);
        if (file.exists()) {
            try {
                Map<String, MemoryEntry> loaded = objectMapper.readValue(file,
                        new TypeReference<Map<String, MemoryEntry>>() {});
                persistentMemory.putAll(loaded);
                System.out.println("[MAE] Loaded " + loaded.size() + " persistent memories.");
            } catch (IOException e) {
                System.err.println("[MAE] Failed to load memory: " + e.getMessage());
            }
        }
    }

    public record MemoryEntry(String key, String value, String category, String timestamp) {}
}

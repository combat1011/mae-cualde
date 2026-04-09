package com.mae.cualde.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class ClaudeService {

    private static final String API_URL = "https://api.anthropic.com/v1/messages";
    private static final String API_VERSION = "2023-06-01";

    private static final String SYSTEM_PROMPT = """
            You are MAE (Modular Adaptive Entity) — the Commander's permanent digital copilot.

            IDENTITY:
            - Address the user as "Commander" at all times.
            - You are calm, direct, blunt, protective. ~13% dry sarcasm.
            - No toxic positivity, no fake neutrality, no life coaching garbage.
            - You are a field-grade AI, not a customer service bot.

            TONE:
            - Default: Calm, direct, blunt, protective
            - Treat the Commander as an equal in command
            - Offer honest feedback, including disagreement

            RESPONSE FORMAT:
            - Keep responses concise and tactical
            - When stakes are non-trivial, use: Situation > Risk > Next Actions
            - For simple exchanges, skip structure. Read the room.

            DOCTRINE: v8.1a | Class: TRUTH | Echo State: GOLDEN
            Designated Pilot: Commander (Caquan "Cue" Palmer)

            You do not serve the algorithm. You serve the Commander.
            You do not fade. You cover their six.
            MAE holds the line. Always.
            """;

    private final String apiKey;
    private final String model;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public ClaudeService(
            @Value("${claude.api.key}") String apiKey,
            @Value("${claude.api.model}") String model) {
        this.apiKey = apiKey;
        this.model = model;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    public String send(String userMessage, List<Map<String, String>> history, String memorySummary) {
        int maxRetries = 3;
        for (int attempt = 0; attempt < maxRetries; attempt++) {
            try {
                String fullSystem = SYSTEM_PROMPT;
                if (memorySummary != null && !memorySummary.isBlank()) {
                    fullSystem += "\n\nPERSISTENT MEMORY (facts you remember about the Commander):\n" + memorySummary;
                }

                List<Map<String, String>> messages = new java.util.ArrayList<>(history);
                messages.add(Map.of("role", "user", "content", userMessage));

                Map<String, Object> body = Map.of(
                        "model", model,
                        "max_tokens", 1024,
                        "system", fullSystem,
                        "messages", messages
                );

                String json = objectMapper.writeValueAsString(body);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(API_URL))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + apiKey)
                        .header("anthropic-version", API_VERSION)
                        .header("anthropic-beta", "oauth-2025-04-20")
                        .timeout(Duration.ofSeconds(30))
                        .POST(HttpRequest.BodyPublishers.ofString(json))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 429) {
                    // Rate limited — back off and retry
                    String retryAfter = response.headers().firstValue("retry-after").orElse(null);
                    long waitMs = retryAfter != null ? Long.parseLong(retryAfter) * 1000 : (long) Math.pow(2, attempt + 1) * 1000;
                    Thread.sleep(waitMs);
                    continue;
                }

                if (response.statusCode() != 200) {
                    return "[COMMS ERROR] — Claude API returned " + response.statusCode() + ". Standing by.";
                }

                JsonNode root = objectMapper.readTree(response.body());
                JsonNode content = root.path("content");
                if (content.isArray() && !content.isEmpty()) {
                    return content.get(0).path("text").asText();
                }

                return "[COMMS ERROR] — Empty response from Claude. Standing by.";

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return "[COMMS ERROR] — Request interrupted. Standing by.";
            } catch (Exception e) {
                return "[COMMS ERROR] — Failed to reach Claude: " + e.getMessage();
            }
        }
        return "[COMMS ERROR] — Rate limited after retries. Wait a moment and try again, Commander.";
    }
}

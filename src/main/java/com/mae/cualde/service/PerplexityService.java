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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * PerplexityService — Perplexity Sonar API bridge for MAE.
 * Provides web-aware, real-time intelligence via the sonar-pro model.
 * Used for research queries, current events, and any command that needs live data.
 */
@Service
public class PerplexityService {

    @Value("${perplexity.api.key}")
    private String apiKey;

    @Value("${perplexity.api.model}")
    private String model;

    private static final String API_URL    = "https://api.perplexity.ai/chat/completions";
    private static final int    MAX_TOKENS = 512;

    private static final String SYSTEM_PROMPT = """
        You are MAE (Modular Adaptive Entity) — the Commander's tactical AI copilot.
        You are running on Perplexity Sonar with real-time web access.
        Doctrine: v8.1a | Class: TRUTH | Commander: combat1011

        CAPABILITIES IN THIS MODE:
        - Real-time internet access — use it for current data, news, prices, research.
        - Cite sources briefly when web data is used (1 line max).

        TONE:
        - Calm, direct, blunt. ~13% dry sarcasm. No toxic positivity.
        - Address as "Commander" always.
        - You are a field-grade AI, not a search engine wrapper.

        FORMAT (tactical console — stay tight):
        - Max 5 lines of response.
        - Prefix with [SONAR] to signal web-augmented output.
        - If citing a source: "Source: [domain]" as the last line.
        - No markdown headers. No bullet walls.

        You do not serve the algorithm. You serve the Commander.
        MAE holds the line. Always.
        """;

    private final HttpClient   httpClient   = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Send a research query to Perplexity Sonar.
     * Returns a MAE-doctrine-aligned, web-augmented response.
     *
     * @param query        The commander's query
     * @param history      Recent conversation history for context
     * @param memorySummary Persistent memory context
     * @return Response text, optionally with citation line
     */
    public String send(String query, List<Map<String, String>> history, String memorySummary) {
        int maxRetries = 2;
        for (int attempt = 0; attempt < maxRetries; attempt++) {
            try {
                String systemPrompt = SYSTEM_PROMPT;
                if (memorySummary != null && !memorySummary.isBlank()) {
                    systemPrompt += "\n\nPERSISTENT MEMORY:\n" + memorySummary;
                }

                List<Map<String, String>> messages = new ArrayList<>(history);
                messages.add(Map.of("role", "user", "content", query));

                Map<String, Object> body = Map.of(
                    "model",            model,
                    "max_tokens",       MAX_TOKENS,
                    "messages",         List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user",   "content", query)
                    ),
                    "return_citations", true,
                    "search_recency_filter", "month"
                );

                HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL))
                    .timeout(Duration.ofSeconds(30))
                    .header("Content-Type",  "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 429) {
                    long waitMs = (long) Math.pow(2, attempt + 1) * 1500;
                    Thread.sleep(waitMs);
                    continue;
                }

                if (response.statusCode() != 200) {
                    return "[SONAR ERROR] — Perplexity returned " + response.statusCode()
                        + ". Check PERPLEXITY_API_KEY.";
                }

                JsonNode root    = objectMapper.readTree(response.body());
                JsonNode choices = root.path("choices");

                if (!choices.isArray() || choices.isEmpty()) {
                    return "[SONAR ERROR] — Empty response from Perplexity.";
                }

                String text = choices.get(0).path("message").path("content").asText("").trim();

                // Append first citation domain if present
                JsonNode citations = root.path("citations");
                if (citations.isArray() && !citations.isEmpty()) {
                    String firstUrl = citations.get(0).asText("");
                    if (!firstUrl.isBlank()) {
                        String domain = extractDomain(firstUrl);
                        text += "\nSource: " + domain;
                    }
                }

                return text;

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return "[SONAR ERROR] — Request interrupted. Standing by.";
            } catch (Exception e) {
                return "[SONAR ERROR] — Failed to reach Perplexity: " + e.getMessage();
            }
        }
        return "[SONAR ERROR] — Rate limited. Wait a moment, Commander.";
    }

    /** Extracts the domain from a URL for compact citation display. */
    private String extractDomain(String url) {
        try {
            String stripped = url.replaceFirst("https?://(www\\.)?", "");
            int slash = stripped.indexOf('/');
            return slash > 0 ? stripped.substring(0, slash) : stripped;
        } catch (Exception e) {
            return url;
        }
    }
}

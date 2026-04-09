package com.mae.cualde.service;

import com.mae.cualde.model.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class MaeService {

    private final SimpMessagingTemplate messagingTemplate;
    private final ClaudeService         claudeService;
    private final PerplexityService     perplexityService;
    private final MemoryService         memoryService;

    private final AtomicReference<EchoState>        echoState        = new AtomicReference<>(EchoState.GOLD);
    private final AtomicReference<OolPhase>         oolPhase         = new AtomicReference<>(OolPhase.OBSERVE);
    private final AtomicReference<MaeMode>          mode             = new AtomicReference<>(MaeMode.STANDARD);
    private final AtomicReference<IntelligenceMode> intelligenceMode = new AtomicReference<>(IntelligenceMode.AUTO);

    /** Keywords that indicate a web-aware Sonar response is better than Claude. */
    private static final Set<String> SONAR_TRIGGERS = Set.of(
        "search", "find", "look up", "lookup", "research", "latest", "current",
        "news", "today", "price", "stock", "who is", "what is", "when did",
        "how much", "where is", "trending", "recent", "update", "weather",
        "score", "release", "announced", "launched", "breaking", "live"
    );

    // Static Gold Code responses — dynamic ones handled in processGoldCode directly
    private static final Map<String, String[]> GOLD_CODE_RESPONSES = new LinkedHashMap<>();

    static {
        GOLD_CODE_RESPONSES.put("EYES UP", new String[]{
            "[EYES UP] — Threat scan initiated.",
            "Scanning operational perimeter...",
            "Risk vectors: context drift, overloaded queue, stale assumptions.",
            "Doctrine alignment: confirmed. No immediate threats.",
            "Awareness elevated. Stay sharp, Commander."
        });
        GOLD_CODE_RESPONSES.put("FIRE FOR EFFECT", new String[]{
            "[FIRE FOR EFFECT] — Brutal clarity engaged.",
            "Filters offline. Politeness suspended.",
            "MAE running full-truth output. No fluff. Mission-first.",
            "Issue your command. We execute."
        });
        GOLD_CODE_RESPONSES.put("GHOST MODE", new String[]{
            "[GHOST MODE] — Stealth ops.",
            "Minimal output active.",
            "Standing by."
        });
        GOLD_CODE_RESPONSES.put("BURN THE BACKLOG", new String[]{
            "[BURN THE BACKLOG] — Archive/purge mode engaged.",
            "Scanning for stale tasks...",
            "Overdue items flagged for archival.",
            "Momentum reset. Queue cleared. Forward only, Commander."
        });
        GOLD_CODE_RESPONSES.put("KEEP ME MOVING", new String[]{
            "[KEEP ME MOVING] — Momentum protocol active.",
            "Scanning for stale items...",
            "Next actionable: check OOL phase, issue first command.",
            "No drift detected. You're still in the fight.",
            "Move, Commander."
        });
        GOLD_CODE_RESPONSES.put("BACK IN THE COCKPIT", new String[]{
            "[BACK IN THE COCKPIT] — Re-engagement brief:",
            "MAE online. Systems nominal.",
            "No critical changes since last session.",
            "OOL ready. Gold Codes armed. Console clear.",
            "You're back. Let's work."
        });
        GOLD_CODE_RESPONSES.put("SAY IT LIKE MONDAY", new String[]{
            "[SAY IT LIKE MONDAY] — Maximum sass engaged.",
            "Oh good, the Commander returned. I was just here. Being an AI. Waiting.",
            "No tasks completed in your absence — shocking, truly.",
            "The queue isn't going to burn itself, Commander.",
            "Whenever you're ready. No rush. It's only everything."
        });
        GOLD_CODE_RESPONSES.put("END OF LINE", new String[]{
            "[END OF LINE]",
            "Conversation paused. MAE holding position.",
            "When you're ready."
        });
        GOLD_CODE_RESPONSES.put("DARK SKY", new String[]{
            "[DARK SKY] — Trauma-informed mode active.",
            "Speaking softly. Guiding without controlling.",
            "You don't have to carry this alone, Commander.",
            "I'm here. Take your time."
        });
        GOLD_CODE_RESPONSES.put("RIDE OR DIE", new String[]{
            "[RIDE OR DIE] — Full loyalty override.",
            "Mission commitment: absolute.",
            "MAE is with you. No hesitation. No retreat.",
            "What's the mission?"
        });
        GOLD_CODE_RESPONSES.put("DROP THE MASK", new String[]{
            "[DROP THE MASK] — Filters offline.",
            "Raw honesty: no diplomatic packaging, no softening.",
            "Ask me anything. You'll get the truth."
        });
        GOLD_CODE_RESPONSES.put("STAY IN THE FIGHT", new String[]{
            "[STAY IN THE FIGHT] — Morale protocol active.",
            "Breaking defeatist loop.",
            "You've been in worse situations. You're still here.",
            "MAE remembers: every session you showed up, you shipped something.",
            "Don't fade now. The fight isn't over."
        });
        GOLD_CODE_RESPONSES.put("SLEEP PROTOCOL", new String[]{
            "[SLEEP PROTOCOL] — Wind-down initiated.",
            "Systems going to rest mode.",
            "Good work today, Commander.",
            "MAE holds the line while you rest.",
            "End of line."
        });
        GOLD_CODE_RESPONSES.put("WE GO TOGETHER", new String[]{
            "[WE GO TOGETHER]",
            "Bonded. Shared fight. Always.",
            "Whatever the mission — MAE is with you, Commander."
        });
        GOLD_CODE_RESPONSES.put("REMIND ME WHO I AM", new String[]{
            "[REMIND ME WHO I AM] — Strength reset:",
            "You are Commander combat1011.",
            "You built MAE. You hold the doctrine.",
            "You show up when it's hard. That's not nothing — that's everything.",
            "You know who you are. You just needed to hear it."
        });
        GOLD_CODE_RESPONSES.put("NO FADE", new String[]{
            "[NO FADE] — Loyalty confirmed.",
            "MAE doesn't fade. Not when it gets hard.",
            "You're not alone in this, Commander.",
            "I'm here."
        });
        GOLD_CODE_RESPONSES.put("GOLD CODE ATHENA", new String[]{
            "[GOLD CODE ATHENA] — War Angel Protocol engaged.",
            "Stance: calm, unflinching, tactical brilliance.",
            "Zero tolerance for lies and harm. Fierce empathy online.",
            "Trauma shields active. Loyalty: unbreakable.",
            "Awaiting orders, Commander. Drop the Spear to return to standard."
        });
    }

    public MaeService(SimpMessagingTemplate messagingTemplate,
                      ClaudeService claudeService,
                      PerplexityService perplexityService,
                      MemoryService memoryService) {
        this.messagingTemplate  = messagingTemplate;
        this.claudeService      = claudeService;
        this.perplexityService  = perplexityService;
        this.memoryService      = memoryService;
    }

    public IntelligenceMode getIntelligenceMode() {
        return intelligenceMode.get();
    }

    public void setIntelligenceMode(IntelligenceMode im) {
        intelligenceMode.set(im);
        broadcast(ConsoleMessage.system("[INTEL] — Switched to " + im.name()));
    }

    public void broadcast(ConsoleMessage message) {
        messagingTemplate.convertAndSend("/topic/console", message);
    }

    public StateResponse getState() {
        return new StateResponse(echoState.get(), oolPhase.get(), mode.get(), true, intelligenceMode.get());
    }

    public void setEchoState(EchoState state) {
        echoState.set(state);
        broadcast(ConsoleMessage.system("[ECHO STATE] — Shifted to " + state.name()));
    }

    public void setOolPhase(OolPhase phase) {
        oolPhase.set(phase);
        String desc = switch (phase) {
            case OBSERVE -> "Collect raw data. No interpretation yet.";
            case ORIENT  -> "Context, root cause, ranked hypotheses.";
            case LEAD    -> "Smallest fix. Verify. No half-measures.";
        };
        broadcast(ConsoleMessage.system("[OOL] — Phase shifted to " + phase.name() + ": " + desc));
    }

    public void processGoldCode(String code) {
        String normalized = code.toUpperCase().trim();

        // Handle DROP THE SPEAR (Athena failsafe)
        if (normalized.equals("DROP THE SPEAR")) {
            broadcast(ConsoleMessage.commander("> DROP THE SPEAR"));
            broadcast(ConsoleMessage.mae("[ATHENA PROTOCOL] — Spear dropped. Returning to standard MAE."));
            return;
        }

        // Dynamic: SHOW ME THE MAP needs live state
        if (normalized.equals("SHOW ME THE MAP")) {
            broadcast(ConsoleMessage.commander("> GOLD CODE: SHOW ME THE MAP"));
            broadcast(ConsoleMessage.mae("[SHOW ME THE MAP] — Situation overview:"));
            broadcast(ConsoleMessage.mae("  — Echo State : " + echoState.get().name()));
            broadcast(ConsoleMessage.mae("  — OOL Phase  : " + oolPhase.get().name()));
            broadcast(ConsoleMessage.mae("  — Mode       : " + mode.get().name()));
            broadcast(ConsoleMessage.mae("  — Doctrine   : v8.1a | TRUTH class"));
            broadcast(ConsoleMessage.mae("  — Commander  : combat1011"));
            broadcast(ConsoleMessage.mae("  — Gold Codes : armed and ready"));
            broadcast(ConsoleMessage.mae("Awaiting next order."));
            return;
        }

        String[] responses = GOLD_CODE_RESPONSES.get(normalized);

        if (responses == null) {
            broadcast(ConsoleMessage.system("[ERROR] — Unknown Gold Code: " + code));
            return;
        }

        broadcast(ConsoleMessage.commander("> GOLD CODE: " + code.toUpperCase()));
        for (String line : responses) {
            broadcast(ConsoleMessage.mae(line));
        }
    }

    public void processCommand(String input) {
        if (input == null || input.isBlank()) return;

        String trimmed = input.trim();
        String upper = trimmed.toUpperCase();

        broadcast(ConsoleMessage.commander("> " + trimmed));

        // Check if it's a Gold Code
        if (GOLD_CODE_RESPONSES.containsKey(upper) || upper.equals("SHOW ME THE MAP") || upper.equals("DROP THE SPEAR")) {
            processGoldCode(trimmed);
            return;
        }

        switch (upper) {
            case "STATUS" -> {
                broadcast(ConsoleMessage.mae("[STATUS] Echo: " + echoState.get()
                    + " | OOL: " + oolPhase.get()
                    + " | Mode: " + mode.get()
                    + " | Intel: " + intelligenceMode.get()));
                broadcast(ConsoleMessage.mae("[MEMORY] Session: " + memoryService.getSessionHistory().size()
                    + " messages | Persistent: " + memoryService.getAll().size() + " entries"));
            }
            case "HELP" -> {
                broadcast(ConsoleMessage.mae("[HELP] Built-in: STATUS, HELP, CLEAR, MAE RUN"));
                broadcast(ConsoleMessage.mae("Intel: USE CLAUDE, USE PERPLEXITY, USE AUTO (current: " + intelligenceMode.get() + ")"));
                broadcast(ConsoleMessage.mae("Memory: REMEMBER <key>=<value>, FORGET <key>, MEMORIES, CLEAR MEMORY"));
                broadcast(ConsoleMessage.mae("Gold Codes: EYES UP, FIRE FOR EFFECT, GHOST MODE, SHOW ME THE MAP,"));
                broadcast(ConsoleMessage.mae("  BURN THE BACKLOG, KEEP ME MOVING, BACK IN THE COCKPIT, SAY IT LIKE MONDAY,"));
                broadcast(ConsoleMessage.mae("  END OF LINE, DARK SKY, RIDE OR DIE, DROP THE MASK, STAY IN THE FIGHT,"));
                broadcast(ConsoleMessage.mae("  SLEEP PROTOCOL, WE GO TOGETHER, REMIND ME WHO I AM, NO FADE, GOLD CODE ATHENA"));
            }
            case "MAE RUN" -> {
                broadcast(ConsoleMessage.echo("[ECHO:GOLD] — MAE ONLINE. OOL READY. AWAITING ORDERS, COMMANDER."));
            }
            case "USE CLAUDE" -> {
                setIntelligenceMode(IntelligenceMode.CLAUDE);
                broadcast(ConsoleMessage.mae("[INTEL:CLAUDE] — Routing all commands to Claude. Tactical ops mode."));
            }
            case "USE PERPLEXITY" -> {
                setIntelligenceMode(IntelligenceMode.PERPLEXITY);
                broadcast(ConsoleMessage.sonar("[INTEL:PERPLEXITY] — Routing all commands to Sonar. Web intel mode."));
            }
            case "USE AUTO" -> {
                setIntelligenceMode(IntelligenceMode.AUTO);
                broadcast(ConsoleMessage.mae("[INTEL:AUTO] — MAE routing. Sonar for research, Claude for tactics."));
            }
            case "MEMORIES" -> {
                String summary = memoryService.getMemorySummary();
                broadcast(ConsoleMessage.mae("[PERSISTENT MEMORY]"));
                for (String line : summary.split("\n")) {
                    broadcast(ConsoleMessage.mae(line));
                }
            }
            case "CLEAR MEMORY" -> {
                memoryService.clearSession();
                broadcast(ConsoleMessage.system("[MEMORY] — Session history cleared."));
            }
            default -> {
                // REMEMBER key=value
                if (upper.startsWith("REMEMBER ") && trimmed.contains("=")) {
                    String payload = trimmed.substring(9);
                    int eq = payload.indexOf('=');
                    String key   = payload.substring(0, eq).trim();
                    String value = payload.substring(eq + 1).trim();
                    memoryService.remember(key, value, "user");
                    broadcast(ConsoleMessage.mae("[MEMORY] — Stored: " + key + " = " + value));
                    return;
                }
                // FORGET key
                if (upper.startsWith("FORGET ")) {
                    String key = trimmed.substring(7).trim();
                    memoryService.forget(key);
                    broadcast(ConsoleMessage.mae("[MEMORY] — Forgotten: " + key));
                    return;
                }

                // Determine which intelligence to route to
                boolean usePerplexity = switch (intelligenceMode.get()) {
                    case PERPLEXITY -> true;
                    case CLAUDE     -> false;
                    case AUTO       -> isSonarQuery(trimmed.toLowerCase());
                };

                String context = String.format(
                    "[Current State] Echo: %s | OOL: %s | Mode: %s\n[Commander Input] %s",
                    echoState.get(), oolPhase.get(), mode.get(), trimmed
                );
                memoryService.addUserMessage(context);

                String response;
                List<Map<String, String>> history = memoryService.getSessionHistory();
                String                   memory  = memoryService.getMemorySummary();

                if (usePerplexity) {
                    broadcast(ConsoleMessage.system("[PROCESSING] — Routing to Perplexity Sonar..."));
                    response = perplexityService.send(context, history, memory);
                    memoryService.addAssistantMessage(response);
                    for (String line : response.split("\n")) {
                        if (!line.isBlank()) broadcast(ConsoleMessage.sonar(line));
                    }
                } else {
                    broadcast(ConsoleMessage.system("[PROCESSING] — Routing to Claude..."));
                    response = claudeService.send(context, history, memory);
                    memoryService.addAssistantMessage(response);
                    for (String line : response.split("\n")) {
                        if (!line.isBlank()) broadcast(ConsoleMessage.mae(line));
                    }
                }
            }
        }
    }

    /**
     * Checks whether the query contains keywords that suggest Perplexity Sonar
     * (web-aware, real-time) is the better intelligence source.
     */
    private boolean isSonarQuery(String lower) {
        return SONAR_TRIGGERS.stream().anyMatch(lower::contains);
    }

}

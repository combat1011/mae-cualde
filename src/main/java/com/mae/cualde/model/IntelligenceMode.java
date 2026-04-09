package com.mae.cualde.model;

/**
 * IntelligenceMode — which AI backbone handles the current command.
 *
 * CLAUDE     : Anthropic Claude — tactical reasoning, doctrine, code ops
 * PERPLEXITY : Perplexity Sonar — web-aware research, real-time intel
 * AUTO       : MAE decides based on keyword routing
 */
public enum IntelligenceMode {
    CLAUDE, PERPLEXITY, AUTO
}

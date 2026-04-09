package com.mae.cualde.model;

public record StateResponse(EchoState echoState, OolPhase oolPhase, MaeMode mode, boolean online, IntelligenceMode intelligenceMode) {}

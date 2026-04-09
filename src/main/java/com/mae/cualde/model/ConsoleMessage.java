package com.mae.cualde.model;

public record ConsoleMessage(String text, String type, long timestamp) {

    public static ConsoleMessage of(String text, String type) {
        return new ConsoleMessage(text, type, System.currentTimeMillis());
    }

    public static ConsoleMessage mae(String text) {
        return of(text, "mae");
    }

    public static ConsoleMessage system(String text) {
        return of(text, "system");
    }

    public static ConsoleMessage commander(String text) {
        return of(text, "commander");
    }

    public static ConsoleMessage echo(String text) {
        return of(text, "echo");
    }

    public static ConsoleMessage sonar(String text) {
        return of(text, "sonar");
    }
}

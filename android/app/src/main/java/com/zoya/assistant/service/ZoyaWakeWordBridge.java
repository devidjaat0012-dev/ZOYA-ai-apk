package com.zoya.assistant.service;

import android.content.Context;
import android.content.Intent;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.util.Log;

import org.json.JSONObject;

/**
 * ZoyaWakeWordBridge
 * 
 * Android JavascriptInterface bridge bridging web client JavaScript with the native
 * ZoyaAudioRecordWakeWordService background service.
 */
public class ZoyaWakeWordBridge {

    private static final String TAG = "ZoyaWakeWordBridge";
    private final Context context;
    private final WebView webView;
    private boolean isListening = false;
    private String currentWakeWord = "Hey Zoya";
    private float currentSensitivity = 0.65f;

    public ZoyaWakeWordBridge(Context context, WebView webView) {
        this.context = context.getApplicationContext();
        this.webView = webView;

        // Register listener on the background service
        ZoyaAudioRecordWakeWordService.setWakeWordListener(new ZoyaAudioRecordWakeWordService.WakeWordListener() {
            @Override
            public void onWakeWordDetected(String wakeWord, float confidence) {
                notifyWebWakeWordDetected(wakeWord, confidence);
            }

            @Override
            public void onAudioLevelUpdate(float rmsLevel) {
                notifyWebAudioLevel(rmsLevel);
            }

            @Override
            public void onError(String errorMessage) {
                notifyWebError(errorMessage);
            }
        });
    }

    /**
     * Start the native Android AudioRecord Background Service.
     */
    @JavascriptInterface
    public void startAudioRecordWakeWord(String wakeWord, float sensitivity) {
        this.currentWakeWord = (wakeWord != null && !wakeWord.isEmpty()) ? wakeWord : "Hey Zoya";
        this.currentSensitivity = (sensitivity > 0f && sensitivity <= 1f) ? sensitivity : 0.65f;
        this.isListening = true;

        Log.i(TAG, "Starting AudioRecord Background Service for: " + currentWakeWord);

        Intent intent = new Intent(context, ZoyaAudioRecordWakeWordService.class);
        intent.setAction(ZoyaAudioRecordWakeWordService.ACTION_START_LISTENING);
        intent.putExtra(ZoyaAudioRecordWakeWordService.EXTRA_WAKE_WORD, currentWakeWord);
        intent.putExtra(ZoyaAudioRecordWakeWordService.EXTRA_SENSITIVITY, currentSensitivity);

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    /**
     * Stop the native Android AudioRecord Background Service.
     */
    @JavascriptInterface
    public void stopAudioRecordWakeWord() {
        this.isListening = false;
        Log.i(TAG, "Stopping AudioRecord Background Service...");

        Intent intent = new Intent(context, ZoyaAudioRecordWakeWordService.class);
        intent.setAction(ZoyaAudioRecordWakeWordService.ACTION_STOP_LISTENING);
        context.startService(intent);
    }

    /**
     * Change target wake-word dynamically.
     */
    @JavascriptInterface
    public void setWakeWord(String wakeWord) {
        this.currentWakeWord = wakeWord;
        Intent intent = new Intent(context, ZoyaAudioRecordWakeWordService.class);
        intent.setAction(ZoyaAudioRecordWakeWordService.ACTION_SET_WAKE_WORD);
        intent.putExtra(ZoyaAudioRecordWakeWordService.EXTRA_WAKE_WORD, wakeWord);
        context.startService(intent);
    }

    @JavascriptInterface
    public boolean isAudioRecordListening() {
        return this.isListening;
    }

    @JavascriptInterface
    public String getServiceStatus() {
        try {
            JSONObject obj = new JSONObject();
            obj.put("nativeServiceAvailable", true);
            obj.put("isListening", isListening);
            obj.put("targetWakeWord", currentWakeWord);
            obj.put("sensitivity", currentSensitivity);
            obj.put("sampleRateHz", 16000);
            obj.put("audioFormat", "ENCODING_PCM_16BIT");
            obj.put("channelConfig", "CHANNEL_IN_MONO");
            return obj.toString();
        } catch (Exception e) {
            return "{\"nativeServiceAvailable\": true, \"isListening\": " + isListening + "}";
        }
    }

    private void notifyWebWakeWordDetected(final String wakeWord, final float confidence) {
        if (webView != null) {
            webView.post(() -> {
                String js = String.format("if (window.onAndroidWakeWordDetected) { window.onAndroidWakeWordDetected('%s', %f); }",
                        wakeWord.replace("'", "\\'"), confidence);
                webView.evaluateJavascript(js, null);
            });
        }
    }

    private void notifyWebAudioLevel(final float rmsLevel) {
        if (webView != null) {
            webView.post(() -> {
                String js = String.format("if (window.onAndroidAudioRecordLevel) { window.onAndroidAudioRecordLevel(%f); }", rmsLevel);
                webView.evaluateJavascript(js, null);
            });
        }
    }

    private void notifyWebError(final String errorMessage) {
        if (webView != null) {
            webView.post(() -> {
                String js = String.format("if (window.onAndroidAudioRecordError) { window.onAndroidAudioRecordError('%s'); }",
                        errorMessage.replace("'", "\\'"));
                webView.evaluateJavascript(js, null);
            });
        }
    }
}

package com.zoya.assistant.service;

import android.app.Activity;
import android.content.Context;
import android.media.AudioManager;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.util.Log;

/**
 * ZoyaDeviceControlBridge
 * 
 * Android JavascriptInterface bridge providing direct hardware control over:
 * 1. System Media Volume via AudioManager
 * 2. Device Screen Brightness via WindowManager.LayoutParams
 */
public class ZoyaDeviceControlBridge {

    private static final String TAG = "ZoyaDeviceControl";
    private final Context context;
    private final Activity activity;
    private final AudioManager audioManager;

    public ZoyaDeviceControlBridge(Activity activity) {
        this.activity = activity;
        this.context = activity.getApplicationContext();
        this.audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
    }

    /**
     * Adjusts system media volume (0 to 100 percentage).
     */
    @JavascriptInterface
    public void setSystemVolume(int percentage) {
        if (audioManager == null) return;
        try {
            int maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
            int clampedPercent = Math.max(0, Math.min(100, percentage));
            int targetIndex = Math.round((clampedPercent / 100.0f) * maxVol);

            Log.i(TAG, "Setting system volume: " + clampedPercent + "% -> index: " + targetIndex + "/" + maxVol);
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, targetIndex, AudioManager.FLAG_SHOW_UI);
        } catch (Exception e) {
            Log.w(TAG, "Error adjusting system volume: " + e.getMessage());
        }
    }

    /**
     * Retrieves current system media volume percentage.
     */
    @JavascriptInterface
    public int getSystemVolume() {
        if (audioManager == null) return 80;
        try {
            int current = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
            int max = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
            if (max == 0) return 0;
            return Math.round(((float) current / max) * 100);
        } catch (Exception e) {
            return 80;
        }
    }

    /**
     * Adjusts screen brightness (0.1f to 1.0f).
     */
    @JavascriptInterface
    public void setScreenBrightness(final float brightness) {
        if (activity == null) return;
        try {
            final float clamped = Math.max(0.1f, Math.min(1.0f, brightness));
            Log.i(TAG, "Setting screen brightness: " + clamped);

            activity.runOnUiThread(() -> {
                try {
                    WindowManager.LayoutParams layout = activity.getWindow().getAttributes();
                    layout.screenBrightness = clamped;
                    activity.getWindow().setAttributes(layout);
                } catch (Exception ex) {
                    Log.w(TAG, "Failed to apply window screen brightness: " + ex.getMessage());
                }
            });
        } catch (Exception e) {
            Log.w(TAG, "Error setting screen brightness: " + e.getMessage());
        }
    }

    /**
     * Retrieves current screen brightness setting.
     */
    @JavascriptInterface
    public float getScreenBrightness() {
        if (activity == null) return 1.0f;
        try {
            WindowManager.LayoutParams layout = activity.getWindow().getAttributes();
            return layout.screenBrightness < 0 ? 1.0f : layout.screenBrightness;
        } catch (Exception e) {
            return 1.0f;
        }
    }
}

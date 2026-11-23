package com.zoya.assistant.service;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

/**
 * BootReceiver
 * Automatically restarts ZoyaAudioRecordWakeWordService on Android device boot
 * if hands-free wake-word detection was left enabled by user.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "ZoyaBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())) {

            Log.i(TAG, "Device booted. Checking Zoya AudioRecord wake-word preference...");

            SharedPreferences prefs = context.getSharedPreferences("zoya_settings", Context.MODE_PRIVATE);
            boolean wakeWordEnabled = prefs.getBoolean("audiorecord_wakeword_enabled", true);
            String wakeWord = prefs.getString("audiorecord_target_wakeword", "Hey Zoya");
            float sensitivity = prefs.getFloat("audiorecord_sensitivity", 0.65f);

            if (wakeWordEnabled) {
                Log.i(TAG, "Auto-starting Zoya AudioRecord Wake-Word Background Service on boot.");
                Intent serviceIntent = new Intent(context, ZoyaAudioRecordWakeWordService.class);
                serviceIntent.setAction(ZoyaAudioRecordWakeWordService.ACTION_START_LISTENING);
                serviceIntent.putExtra(ZoyaAudioRecordWakeWordService.EXTRA_WAKE_WORD, wakeWord);
                serviceIntent.putExtra(ZoyaAudioRecordWakeWordService.EXTRA_SENSITIVITY, sensitivity);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            }
        }
    }
}

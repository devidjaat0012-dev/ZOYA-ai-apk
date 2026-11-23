# Keep JavascriptInterface bridges used by Zoya WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keep class com.devid.zoya.assistant.** { *; }

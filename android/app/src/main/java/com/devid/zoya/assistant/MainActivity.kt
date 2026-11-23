package com.devid.zoya.assistant

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Message
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.webkit.WebViewAssetLoader
import com.zoya.assistant.service.ZoyaDeviceControlBridge
import com.zoya.assistant.service.ZoyaWakeWordBridge

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var isPageReady = false
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var pendingWebPermissionRequest: PermissionRequest? = null

    private val runtimePermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { results ->
            val pending = pendingWebPermissionRequest
            pendingWebPermissionRequest = null
            if (pending != null) {
                val resourcesToGrant = mutableListOf<String>()
                for (res in pending.resources) {
                    when (res) {
                        PermissionRequest.RESOURCE_AUDIO_CAPTURE -> {
                            val granted = results[Manifest.permission.RECORD_AUDIO] == true ||
                                hasPermission(Manifest.permission.RECORD_AUDIO)
                            if (granted) resourcesToGrant.add(res)
                        }
                        PermissionRequest.RESOURCE_VIDEO_CAPTURE -> {
                            val granted = results[Manifest.permission.CAMERA] == true ||
                                hasPermission(Manifest.permission.CAMERA)
                            if (granted) resourcesToGrant.add(res)
                        }
                        else -> resourcesToGrant.add(res)
                    }
                }
                if (resourcesToGrant.isNotEmpty()) {
                    pending.grant(resourcesToGrant.toTypedArray())
                } else {
                    pending.deny()
                }
            }
        }

    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = fileUploadCallback ?: return@registerForActivityResult
            fileUploadCallback = null
            val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            callback.onReceiveValue(uris)
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        splashScreen.setKeepOnScreenCondition { !isPageReady }

        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, true)
        window.statusBarColor = Color.parseColor("#090B10")
        window.navigationBarColor = Color.parseColor("#090B10")

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#090B10"))
            overScrollMode = View.OVER_SCROLL_NEVER
            isHorizontalScrollBarEnabled = false
            isVerticalScrollBarEnabled = false
        }
        setContentView(webView)

        configureWebView()
        requestEssentialPermissions()
        setupBackNavigation()

        webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html")
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            allowContentAccess = true
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            setSupportMultipleWindows(true)
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            cacheMode = WebSettings.LOAD_DEFAULT
            userAgentString = "$userAgentString ZoyaAndroidApp/${BuildConfig.VERSION_NAME}"
        }

        // Attach Zoya's full native hardware & background wake-word bridges
        webView.addJavascriptInterface(ZoyaDeviceControlBridge(this), "ZoyaDeviceControlBridge")
        val wakeBridge = ZoyaWakeWordBridge(this, webView)
        webView.addJavascriptInterface(wakeBridge, "ZoyaWakeWordBridge")
        webView.addJavascriptInterface(wakeBridge, "AndroidAudioRecordBridge")
        webView.addJavascriptInterface(wakeBridge, "AndroidWakeWordBridge")
        webView.addJavascriptInterface(NativeAppBridge(), "ZoyaNativeAppBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                isPageReady = true
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url = request.url
                val host = url.host ?: ""
                if (host == "appassets.androidplatform.net") {
                    return false
                }
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, url))
                    true
                } catch (_: Exception) {
                    false
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    val needed = mutableListOf<String>()
                    for (res in request.resources) {
                        if (res == PermissionRequest.RESOURCE_AUDIO_CAPTURE &&
                            !hasPermission(Manifest.permission.RECORD_AUDIO)
                        ) {
                            needed.add(Manifest.permission.RECORD_AUDIO)
                        }
                        if (res == PermissionRequest.RESOURCE_VIDEO_CAPTURE &&
                            !hasPermission(Manifest.permission.CAMERA)
                        ) {
                            needed.add(Manifest.permission.CAMERA)
                        }
                    }

                    if (needed.isEmpty()) {
                        request.grant(request.resources)
                    } else {
                        pendingWebPermissionRequest?.deny()
                        pendingWebPermissionRequest = request
                        runtimePermissionLauncher.launch(needed.toTypedArray())
                    }
                }
            }

            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback
                return try {
                    fileChooserLauncher.launch(fileChooserParams.createIntent())
                    true
                } catch (_: Exception) {
                    fileUploadCallback = null
                    false
                }
            }

            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: Message?
            ): Boolean {
                val href = view?.hitTestResult?.extra
                if (!href.isNullOrBlank()) {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(href)))
                    } catch (_: Exception) {
                    }
                }
                return false
            }

            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                return super.onConsoleMessage(consoleMessage)
            }
        }
    }

    private fun requestEssentialPermissions() {
        val required = mutableListOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CAMERA
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            required.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        val missing = required.filter { !hasPermission(it) }
        if (missing.isNotEmpty()) {
            runtimePermissionLauncher.launch(missing.toTypedArray())
        }
    }

    private fun hasPermission(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(this, permission) ==
            PackageManager.PERMISSION_GRANTED
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (this@MainActivity::webView.isInitialized && webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    override fun onDestroy() {
        if (this::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }

    inner class NativeAppBridge {
        @JavascriptInterface
        fun isNativeApp(): Boolean = true

        @JavascriptInterface
        fun getPackageName(): String = BuildConfig.APPLICATION_ID

        @JavascriptInterface
        fun getVersionName(): String = BuildConfig.VERSION_NAME

        @JavascriptInterface
        fun getBackendUrl(): String {
            return getSharedPreferences("zoya_prefs", Context.MODE_PRIVATE)
                .getString("backend_url", "") ?: ""
        }

        @JavascriptInterface
        fun setBackendUrl(url: String) {
            getSharedPreferences("zoya_prefs", Context.MODE_PRIVATE)
                .edit()
                .putString("backend_url", url.trim())
                .apply()
        }
    }
}

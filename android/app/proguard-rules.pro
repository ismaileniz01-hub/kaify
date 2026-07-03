# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ---------------------------------------------------------------------------
# Capacitor keep rules — plugins are resolved via reflection/annotations, so
# R8 must not strip or rename them. Without these the release build crashes.
# ---------------------------------------------------------------------------
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.PluginMethod public *;
}
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
}

# App package (MainActivity etc.).
-keep class org.kaify.app.** { *; }

# Cordova bridge used by capacitor-cordova-android-plugins.
-keep class org.apache.cordova.** { *; }

# Anything exposed to the WebView JS bridge.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep annotations/signatures needed by the above.
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod

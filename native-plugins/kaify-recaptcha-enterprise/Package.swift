// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "KaifyRecaptchaEnterprise",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "KaifyRecaptchaEnterprise",
            targets: ["KaifyRecaptchaEnterprisePlugin"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.5.0"),
        .package(
            url: "https://github.com/GoogleCloudPlatform/recaptcha-enterprise-mobile-sdk.git",
            from: "18.9.0"
        ),
    ],
    targets: [
        .target(
            name: "KaifyRecaptchaEnterprisePlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "RecaptchaEnterprise", package: "recaptcha-enterprise-mobile-sdk"),
            ],
            path: "ios/Sources/KaifyRecaptchaEnterprisePlugin"
        )
    ]
)

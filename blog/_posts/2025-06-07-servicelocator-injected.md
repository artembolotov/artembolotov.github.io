---
title: "ServiceLocator и&nbsp;@Injected: как упростить работу с&nbsp;зависимостями в&nbsp;iOS"
description: "Простой и&nbsp;понятный способ организации кода в&nbsp;Swift-приложениях без сложных фреймворков"
tags: [iosdev]
---

Представьте, что вы&nbsp;строите дом. У&nbsp;вас есть электрик, сантехник, маляр&nbsp;&mdash; каждый специалист отвечает за&nbsp;свою часть работы. В&nbsp;программировании похожая ситуация: у&nbsp;нас есть разные сервисы (службы), каждый из&nbsp;которых выполняет свою задачу. Сегодня расскажу, как удобно организовать работу с&nbsp;такими сервисами в&nbsp;iOS-приложении на&nbsp;SwiftUI.

## Проблема: запутанные связи

Когда приложение растёт, в&nbsp;нём появляется всё больше компонентов, которые должны друг с&nbsp;другом взаимодействовать. Например:
- Сервис для работы с&nbsp;сетью
- Сервис для сохранения данных
- Сервис аналитики
- И&nbsp;так далее...

Без правильной организации код быстро превращается в&nbsp;спагетти, где всё зависит от&nbsp;всего.

## Решение: ServiceLocator

ServiceLocator&nbsp;&mdash; это как справочная служба в&nbsp;большом офисном центре. Вместо того чтобы бегать по&nbsp;этажам в&nbsp;поисках нужного специалиста, вы&nbsp;просто обращаетесь в&nbsp;справочную: &laquo;Мне нужен бухгалтер&raquo;&nbsp;&mdash; и&nbsp;вам сразу говорят, где его найти.

Вот как это выглядит в&nbsp;коде:

```swift
final class ServiceLocator {
    // Singleton instance for the entire app
    static let shared = ServiceLocator()
    
    // Dictionary to store all services
    private lazy var services = [String: Any]()
    
    // Register a new service
    func addService<T>(service: T) {
        let key = String(describing: T.self)
        services[key] = service
    }
    
    // Get a service
    func getService<T>() -> T {
        let key = String(describing: T.self)
        guard let service = services[key] as? T else {
            fatalError("Service of type \(T.self) is not registered!")
        }
        return service
    }
}
```

## Магия @propertyWrapper

Но&nbsp;постоянно писать `ServiceLocator.shared.getService()`&nbsp;&mdash; утомительно. Здесь на&nbsp;помощь приходит возможность Swift создавать собственные &laquo;обёртки&raquo; для свойств. Это как автоматический дозатор мыла&nbsp;&mdash; вы&nbsp;просто подносите руки, а&nbsp;он&nbsp;сам выдаёт нужное количество.

```swift
@propertyWrapper
struct Injected<Service> {
    private lazy var service: Service = ServiceLocator.shared.getService()
    
    var wrappedValue: Service {
        mutating get { service }
    }

    public var projectedValue: Injected<Service> {
        get { self }
        set { self = newValue }
    }
}
```

## Важность протоколов: контракт вместо реализации

Представьте, что вы&nbsp;нанимаете водителя. Вам важно, что он&nbsp;умеет водить машину, а&nbsp;не&nbsp;то, какой марки у&nbsp;него права. В&nbsp;программировании протоколы работают так&nbsp;же&nbsp;&mdash; они описывают, ЧТО должен уметь делать сервис, а&nbsp;не&nbsp;КАК он&nbsp;это делает.

### Почему это важно?

Допустим, вы&nbsp;создали приложение, которое сохраняет данные в&nbsp;iCloud. Но&nbsp;потом решили, что хотите сохранять их&nbsp;локально. Если вы&nbsp;использовали протоколы, то&nbsp;замена будет простой как щелчок выключателя.

Вот пример:

```swift
// Protocol describes WHAT the storage service should do
protocol StorageServiceProtocol {
    func save(data: String, key: String)
    func load(key: String) -> String?
    func delete(key: String)
}

// Implementation for iCloud
class CloudStorageService: StorageServiceProtocol {
    func save(data: String, key: String) {
        print("Saving to iCloud: \(data)")
        // Code to work with iCloud
    }
    
    func load(key: String) -> String? {
        print("Loading from iCloud")
        return "data from cloud"
    }
    
    func delete(key: String) {
        print("Deleting from iCloud")
    }
}

// Implementation for local storage
class LocalStorageService: StorageServiceProtocol {
    func save(data: String, key: String) {
        print("Saving locally: \(data)")
        // Code to work with UserDefaults
    }
    
    func load(key: String) -> String? {
        print("Loading locally")
        return "local data"
    }
    
    func delete(key: String) {
        print("Deleting locally")
    }
}
```

### Магия замены

Теперь смотрите, как просто поменять реализацию:

```swift
// Choose implementation when app starts
if userHasInternet {
    ServiceLocator.shared.addService(service: CloudStorageService() as StorageServiceProtocol)
} else {
    ServiceLocator.shared.addService(service: LocalStorageService() as StorageServiceProtocol)
}

// No need to change anything in the app code!
struct SettingsView: View {
    @Injected private var storage: StorageServiceProtocol
    @State private var userName = ""
    
    var body: some View {
        VStack {
            TextField("Your name", text: $userName)
            
            Button("Save") {
                storage.save(data: userName, key: "user_name")
            }
        }
        .onAppear {
            userName = storage.load(key: "user_name") ?? ""
        }
    }
}
```

## Как это работает на&nbsp;практике в&nbsp;SwiftUI

### Шаг 1: Создаём протокол и&nbsp;реализацию

```swift
// Protocol for network operations
protocol NetworkServiceProtocol {
    func loadUserData() async throws -> UserData
    func sendAnalytics(event: String)
}

// Real implementation
class NetworkService: NetworkServiceProtocol {
    func loadUserData() async throws -> UserData {
        // API call code here
        return UserData(name: "Artem", email: "ar@bolotov.dev")
    }
    
    func sendAnalytics(event: String) {
        print("Sending analytics: \(event)")
    }
}

// Mock implementation for development
class MockNetworkService: NetworkServiceProtocol {
    func loadUserData() async throws -> UserData {
        // Return test data without server call
        return UserData(name: "Test User", email: "test@example.com")
    }
    
    func sendAnalytics(event: String) {
        print("TEST: \(event)")
    }
}

// Data model
struct UserData {
    let name: String
    let email: String
}
```

### Шаг 2: Регистрируем сервисы в&nbsp;точке входа

```swift
@main
struct MyApp: App {
    init() {
        setupServices()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
    
    private func setupServices() {
        #if DEBUG
        // Use mock services in development
        ServiceLocator.shared.addService(service: MockNetworkService() as NetworkServiceProtocol)
        #else
        // Use real services in production
        ServiceLocator.shared.addService(service: NetworkService() as NetworkServiceProtocol)
        #endif
        
        // Register other services
        ServiceLocator.shared.addService(service: AnalyticsService() as AnalyticsServiceProtocol)
        ServiceLocator.shared.addService(service: KeychainService() as KeychainServiceProtocol)
    }
}
```

### Шаг 3: Используем в&nbsp;SwiftUI Views

```swift
struct ProfileView: View {
    @Injected private var network: NetworkServiceProtocol
    @Injected private var analytics: AnalyticsServiceProtocol
    
    @State private var userData: UserData?
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            VStack {
                if isLoading {
                    ProgressView()
                        .padding()
                } else if let userData = userData {
                    VStack(spacing: 20) {
                        Text("Hello, \(userData.name)!")
                            .font(.title)
                        
                        Text(userData.email)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                } else if let error = errorMessage {
                    Text(error)
                        .foregroundColor(.red)
                        .padding()
                }
                
                Button("Reload") {
                    Task {
                        await loadUserData()
                    }
                }
                .buttonStyle(.borderedProminent)
            }
            .navigationTitle("Profile")
            .onAppear {
                analytics.trackEvent("ProfileView opened")
                Task {
                    await loadUserData()
                }
            }
        }
    }
    
    private func loadUserData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            userData = try await network.loadUserData()
            analytics.trackEvent("User data loaded")
        } catch {
            errorMessage = "Failed to load data: \(error.localizedDescription)"
            analytics.trackEvent("User data load failed")
        }
        
        isLoading = false
    }
}
```

## Продвинутый пример: ObservableObject с&nbsp;сервисами

Часто в&nbsp;SwiftUI нужно использовать сервисы внутри ObservableObject:

```swift
// Protocol for authentication
protocol AuthServiceProtocol {
    func login(email: String, password: String) async throws -> User
    func logout()
    var isAuthenticated: Bool { get }
}

// ViewModel using services
class AuthViewModel: ObservableObject {
    @Injected private var authService: AuthServiceProtocol
    @Injected private var analytics: AnalyticsServiceProtocol
    
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var isAuthenticated = false
    
    func login(email: String, password: String) async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        
        do {
            let user = try await authService.login(email: email, password: password)
            analytics.trackEvent("Login successful", parameters: ["user_id": user.id])
            
            await MainActor.run {
                isAuthenticated = true
                isLoading = false
            }
        } catch {
            analytics.trackEvent("Login failed")
            
            await MainActor.run {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }
    
    func logout() {
        authService.logout()
        analytics.trackEvent("User logged out")
        isAuthenticated = false
    }
}

// SwiftUI View using ViewModel
struct LoginView: View {
    @StateObject private var viewModel = AuthViewModel()
    @State private var email = ""
    @State private var password = ""
    
    var body: some View {
        Form {
            TextField("Email", text: $email)
                .textContentType(.emailAddress)
                .autocapitalization(.none)
            
            SecureField("Password", text: $password)
                .textContentType(.password)
            
            if let error = viewModel.errorMessage {
                Text(error)
                    .foregroundColor(.red)
                    .font(.caption)
            }
            
            Button(action: {
                Task {
                    await viewModel.login(email: email, password: password)
                }
            }) {
                if viewModel.isLoading {
                    ProgressView()
                } else {
                    Text("Login")
                }
            }
            .disabled(viewModel.isLoading || email.isEmpty || password.isEmpty)
        }
        .navigationTitle("Login")
    }
}
```

## Практический пример: переключение окружений

```swift
// Protocol for configuration
protocol ConfigServiceProtocol {
    var apiBaseURL: String { get }
    var environment: Environment { get }
}

enum Environment {
    case development
    case staging
    case production
}

// Different implementations
class DevConfigService: ConfigServiceProtocol {
    var apiBaseURL = "https://dev-api.example.com"
    var environment = Environment.development
}

class ProdConfigService: ConfigServiceProtocol {
    var apiBaseURL = "https://api.example.com"
    var environment = Environment.production
}

// Settings view to switch environments
struct SettingsView: View {
    @Injected private var config: ConfigServiceProtocol
    
    var body: some View {
        List {
            Section("Environment") {
                Label(config.environment.rawValue, systemImage: "server.rack")
                Text(config.apiBaseURL)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .navigationTitle("Settings")
    }
}
```

## Советы для SwiftUI разработчиков

### 1. Используйте @Injected в&nbsp;View напрямую

```swift
struct ContentView: View {
    @Injected private var network: NetworkServiceProtocol
    
    var body: some View {
        // Use service directly in view
    }
}
```

### 2. Для StateObject создайте фабричный метод

```swift
extension ServiceLocator {
    func makeAuthViewModel() -> AuthViewModel {
        return AuthViewModel()
    }
}

struct RootView: View {
    @StateObject private var authViewModel = ServiceLocator.shared.makeAuthViewModel()
    
    var body: some View {
        // Your view code
    }
}
```

### 3. Группируйте регистрацию по&nbsp;смыслу

```swift
extension ServiceLocator {
    func registerNetworkServices() {
        addService(service: APIService() as APIServiceProtocol)
        addService(service: ImageLoader() as ImageLoaderProtocol)
    }
    
    func registerStorageServices() {
        addService(service: KeychainService() as KeychainServiceProtocol)
        addService(service: UserDefaultsService() as UserDefaultsServiceProtocol)
    }
}
```

## Заключение

ServiceLocator с&nbsp;@Injected и&nbsp;протоколами отлично работает в&nbsp;SwiftUI приложениях. Вы&nbsp;получаете простоту использования, чистый код и&nbsp;возможность легко менять реализацию сервисов.

Помните: протокол&nbsp;&mdash; это контракт между частями вашего приложения. Он&nbsp;говорит &laquo;что делать&raquo;, а&nbsp;реализация решает &laquo;как делать&raquo;. Это даёт свободу менять &laquo;как&raquo; без изменения &laquo;что&raquo;.

Начните использовать этот подход в&nbsp;своих SwiftUI проектах&nbsp;&mdash; и&nbsp;вы&nbsp;удивитесь, насколько проще станет организовывать код и&nbsp;добавлять новые функции!
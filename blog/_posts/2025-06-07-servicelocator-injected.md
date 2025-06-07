---
title: "ServiceLocator и&nbsp;@Injected: как упростить работу с&nbsp;зависимостями в&nbsp;iOS"
description: "Простой и&nbsp;понятный способ организации кода в&nbsp;Swift-приложениях без сложных фреймворков"
tags: [iosdev]
---

Представьте, что вы&nbsp;строите дом. У&nbsp;вас есть электрик, сантехник, маляр&nbsp;&mdash; каждый специалист отвечает за&nbsp;свою часть работы. В&nbsp;программировании похожая ситуация: у&nbsp;нас есть разные сервисы (службы), каждый из&nbsp;которых выполняет свою задачу. Сегодня расскажу, как удобно организовать работу с&nbsp;такими сервисами в&nbsp;iOS-приложении.

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
class DataManager {
    @Injected private var storage: StorageServiceProtocol
    
    func saveUserData() {
        storage.save(data: "Important data", key: "user_data")
        // Works with any implementation!
    }
}
```

## Как это работает на&nbsp;практике

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
        return UserData(name: "Artem")
    }
    
    func sendAnalytics(event: String) {
        print("Sending analytics: \(event)")
    }
}

// Mock implementation for development
class MockNetworkService: NetworkServiceProtocol {
    func loadUserData() async throws -> UserData {
        // Return test data without server call
        return UserData(name: "Test User")
    }
    
    func sendAnalytics(event: String) {
        print("TEST: \(event)")
    }
}
```

### Шаг 2: Регистрируем нужную версию

```swift
class App {
    init() {
        setupServices()
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

### Шаг 3: Используем везде одинаково

```swift
class ProfileViewController: UIViewController {
    @Injected private var network: NetworkServiceProtocol
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        Task {
            do {
                let userData = try await network.loadUserData()
                updateUI(with: userData)
            } catch {
                showError(error)
            }
        }
    }
}
```

## Практический пример: смена системы аналитики

Представим, что вы&nbsp;решили перейти с&nbsp;одной системы аналитики на&nbsp;другую. Благодаря протоколам это делается легко:

```swift
// Analytics protocol
protocol AnalyticsServiceProtocol {
    func trackEvent(_ name: String)
    func trackEvent(_ name: String, parameters: [String: Any])
}

// Implementation for System A
class AnalyticsSystemA: AnalyticsServiceProtocol {
    func trackEvent(_ name: String) {
        // Send event to System A
    }
    
    func trackEvent(_ name: String, parameters: [String: Any]) {
        // Send event with parameters to System A
    }
}

// Implementation for System B
class AnalyticsSystemB: AnalyticsServiceProtocol {
    func trackEvent(_ name: String) {
        // Send event to System B
    }
    
    func trackEvent(_ name: String, parameters: [String: Any]) {
        // Send event with parameters to System B
    }
}

// Easy switch between implementations
if shouldUseNewAnalytics {
    ServiceLocator.shared.addService(service: AnalyticsSystemB() as AnalyticsServiceProtocol)
} else {
    ServiceLocator.shared.addService(service: AnalyticsSystemA() as AnalyticsServiceProtocol)
}
```

## Преимущества использования протоколов

1. **Гибкость**: Легко менять реализацию без изменения основного кода
2. **Тестирование**: Можно создавать тестовые версии сервисов
3. **Разработка**: Можно работать с&nbsp;заглушками, пока бэкенд не&nbsp;готов
4. **A/B тестирование**: Легко тестировать разные подходы

## Советы для начинающих

### 1. Всегда начинайте с&nbsp;протокола

Даже если у&nbsp;вас пока одна реализация:

```swift
// First create protocol
protocol AnalyticsServiceProtocol {
    func trackEvent(_ name: String)
}

// Then implementation
class AnalyticsService: AnalyticsServiceProtocol {
    func trackEvent(_ name: String) {
        // Event tracking implementation
    }
}
```

### 2. Называйте протоколы понятно

Добавляйте суффикс `Protocol` или префикс с&nbsp;описанием функционала:

```swift
protocol DataPersisting { }      // Good
protocol StorageProtocol { }     // Good
protocol Storage { }             // Can be confused with class
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
        addService(service: CacheService() as CacheServiceProtocol)
    }
}
```

## Заключение

ServiceLocator с&nbsp;@Injected и&nbsp;протоколами&nbsp;&mdash; это мощная комбинация, которая делает код гибким и&nbsp;удобным для поддержки. Вы&nbsp;получаете простоту использования и&nbsp;возможность легко менять реализацию в&nbsp;будущем.

Помните: протокол&nbsp;&mdash; это контракт между частями вашего приложения. Он&nbsp;говорит &laquo;что делать&raquo;, а&nbsp;реализация решает &laquo;как делать&raquo;. Это даёт свободу менять &laquo;как&raquo; без изменения &laquo;что&raquo;.

Начните использовать этот подход в&nbsp;своих проектах&nbsp;&mdash; и&nbsp;вы&nbsp;удивитесь, насколько проще станет вносить изменения и&nbsp;добавлять новые функции!
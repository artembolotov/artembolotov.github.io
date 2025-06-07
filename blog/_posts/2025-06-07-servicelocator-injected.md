---
title: "ServiceLocator и @Injected: упрощаем работу с зависимостями (в iOS)"
description: "Простой и понятный способ организации кода в Swift-приложениях без сложных фреймворков"
tags: [iosdev]
draft: true
---

Представьте, что вы строите дом. У вас есть электрик, сантехник, маляр — каждый специалист отвечает за свою часть работы. В программировании похожая ситуация: у нас есть разные сервисы (службы), каждый из которых выполняет свою задачу. Сегодня расскажу, как удобно организовать работу с такими сервисами в iOS-приложении.

## Проблема: запутанные связи

Когда приложение растёт, в нём появляется всё больше компонентов, которые должны друг с другом взаимодействовать. Например:
- Сервис для работы с сетью
- Сервис для сохранения данных
- Сервис аналитики
- И так далее...

Без правильной организации код быстро превращается в спагетти, где всё зависит от всего.

## Решение: ServiceLocator

ServiceLocator — это как справочная служба в большом офисном центре. Вместо того чтобы бегать по этажам в поисках нужного специалиста, вы просто обращаетесь в справочную: «Мне нужен бухгалтер» — и вам сразу говорят, где его найти.

Вот как это выглядит в коде:

```swift
final class ServiceLocator {
    // Единственный экземпляр на всё приложение
    static let shared = ServiceLocator()
    
    // Словарь для хранения всех сервисов
    private lazy var services = [String: Any]()
    
    // Регистрация нового сервиса
    func addService<T>(service: T) {
        let key = String(describing: T.self)
        services[key] = service
    }
    
    // Получение сервиса
    func getService<T>() -> T {
        let key = String(describing: T.self)
        guard let service = services[key] as? T else {
            fatalError("Сервис типа \(T.self) не зарегистрирован!")
        }
        return service
    }
}
```

## Магия @propertyWrapper

Но постоянно писать `ServiceLocator.shared.getService()` — утомительно. Здесь на помощь приходит возможность Swift создавать собственные «обёртки» для свойств. Это как автоматический дозатор мыла — вы просто подносите руки, а он сам выдаёт нужное количество.

```swift
@propertyWrapper
struct Injected<Service> {
    private lazy var service: Service = ServiceLocator.shared.getService()
    
    var wrappedValue: Service {
        mutating get { service }
    }
}
```

## Важность протоколов: контракт вместо реализации

Представьте, что вы нанимаете водителя. Вам важно, что он умеет водить машину, а не то, какой марки у него права. В программировании протоколы работают так же — они описывают, ЧТО должен уметь делать сервис, а не КАК он это делает.

### Почему это важно?

Допустим, вы создали приложение, которое сохраняет данные в iCloud. Но потом решили, что хотите сохранять их локально. Если вы использовали протоколы, то замена будет простой как щелчок выключателя.

Вот пример:

```swift
// Протокол описывает, ЧТО должен уметь сервис хранения
protocol StorageServiceProtocol {
    func save(data: String, key: String)
    func load(key: String) -> String?
    func delete(key: String)
}

// Реализация для iCloud
class CloudStorageService: StorageServiceProtocol {
    func save(data: String, key: String) {
        print("Сохраняю в iCloud: \(data)")
        // Код для работы с iCloud
    }
    
    func load(key: String) -> String? {
        print("Загружаю из iCloud")
        return "данные из облака"
    }
    
    func delete(key: String) {
        print("Удаляю из iCloud")
    }
}

// Реализация для локального хранилища
class LocalStorageService: StorageServiceProtocol {
    func save(data: String, key: String) {
        print("Сохраняю локально: \(data)")
        // Код для работы с UserDefaults
    }
    
    func load(key: String) -> String? {
        print("Загружаю локально")
        return "локальные данные"
    }
    
    func delete(key: String) {
        print("Удаляю локально")
    }
}
```

### Магия замены

Теперь смотрите, как просто поменять реализацию:

```swift
// При запуске приложения выбираем нужную реализацию
if userHasInternet {
    ServiceLocator.shared.addService(service: CloudStorageService() as StorageServiceProtocol)
} else {
    ServiceLocator.shared.addService(service: LocalStorageService() as StorageServiceProtocol)
}

// В коде приложения ничего менять не нужно!
class DataManager {
    @Injected private var storage: StorageServiceProtocol
    
    func saveUserData() {
        storage.save(data: "Важные данные", key: "user_data")
        // Работает с любой реализацией!
    }
}
```

## Как это работает на практике

### Шаг 1: Создаём протокол и реализацию

```swift
// Протокол для работы с сетью
protocol NetworkServiceProtocol {
    func loadUserData() async throws -> UserData
    func sendAnalytics(event: String)
}

// Реальная реализация
class NetworkService: NetworkServiceProtocol {
    func loadUserData() async throws -> UserData {
        // Здесь код для работы с API
        return UserData(name: "Артём")
    }
    
    func sendAnalytics(event: String) {
        print("Отправляю аналитику: \(event)")
    }
}

// Тестовая реализация для разработки
class MockNetworkService: NetworkServiceProtocol {
    func loadUserData() async throws -> UserData {
        // Возвращаем тестовые данные без обращения к серверу
        return UserData(name: "Тестовый пользователь")
    }
    
    func sendAnalytics(event: String) {
        print("ТЕСТ: \(event)")
    }
}
```

### Шаг 2: Регистрируем нужную версию

```swift
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, 
                    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        #if DEBUG
        // В режиме разработки используем тестовые сервисы
        ServiceLocator.shared.addService(service: MockNetworkService() as NetworkServiceProtocol)
        #else
        // В продакшене — реальные
        ServiceLocator.shared.addService(service: NetworkService() as NetworkServiceProtocol)
        #endif
        
        return true
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

## Преимущества использования протоколов

1. **Гибкость**: Легко менять реализацию без изменения основного кода
2. **Тестирование**: Можно создавать тестовые версии сервисов
3. **Разработка**: Можно работать с заглушками, пока бэкенд не готов
4. **A/B тестирование**: Легко тестировать разные подходы

## Советы для начинающих

### 1. Всегда начинайте с протокола

Даже если у вас пока одна реализация:

```swift
// Сначала протокол
protocol AnalyticsServiceProtocol {
    func trackEvent(_ name: String)
}

// Потом реализация
class AnalyticsService: AnalyticsServiceProtocol {
    func trackEvent(_ name: String) {
        // Отправка события
    }
}
```

### 2. Называйте протоколы понятно

Добавляйте суффикс `Protocol` или префикс с описанием функционала:

```swift
protocol DataPersisting { }      // Хорошо
protocol StorageProtocol { }     // Хорошо
protocol Storage { }             // Может путаться с классом
```

### 3. Группируйте регистрацию по смыслу

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

ServiceLocator с @Injected и протоколами — это мощная комбинация, которая делает код гибким и удобным для поддержки. Вы получаете простоту использования и возможность легко менять реализацию в будущем.

Помните: протокол — это контракт между частями вашего приложения. Он говорит «что делать», а реализация решает «как делать». Это даёт свободу менять «как» без изменения «что».

Начните использовать этот подход в своих проектах — и вы удивитесь, насколько проще станет вносить изменения и добавлять новые функции!
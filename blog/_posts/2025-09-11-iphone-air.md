---
title: "О чём не знает iPhone Air"
description: "И проблемы нового ConcentricRectangle. Почему лично мне хочется поскорее увидеть самый тонкий iPhone."
tags: [iosdev]
image: /blog/img/2025-09-11-iphone-air/preview.png
draft: false
---

После презентации Apple решил узнать и добавить углы скругления экрана в [ScreenLines](https://screenlines.app){:target="_blank"} для новых устройств. Установил XCode RC и начал заполнять таблицу. 

Для определения радиуса используем значение скрытой переменной. При публикации в AppStore это нужно убрать, поэтому завернём в `#if DEBUG`

```swift
extension UIScreen {
    static var current: UIScreen? {
        UIWindow.current?.screen
    }
    
    public var deviceCornerRadius: CGFloat {
        let model = UIDevice.current.type
        let radius = model.screenCornerRadius
        
        #if DEBUG
            let actualRadius = self.value(forKey: "_displayCornerRadius") as? CGFloat ?? 0
            print("Model: \(model), stored: \(radius), actual: \(actualRadius)")
        #endif

        return radius
    }
}
```
И получаем такие же углы, как и в iPhone 16 Pro

{% include img.html src="corners.png" alt="Радуисы скругления новых айфонов" %}

Запускаем приложение на симуляторе и видим, что углы обрезаны:

{% include img.html src="air-corners-problem.png" alt="iPhone Air corners problem" %}

Проверяем на iPhone 17, 17 Pro и 17 Pro Max — такой проблемы нет. Проблема симулятора? XCode Preview тоже срезает углы. Попробуем новый ConcentricRectangle, представленный в iOS 26, который сам подстраивается под родительский элемент?

{% include img.html src="concentric-rectangle.png" alt="Concentric rectangle проблему не решил" %}

Проблема осталась (фон покрасил в зелёный чтобы лучше видеть линию и отличать от рамок устройства). Кстати, для iPhone 17 Pro и других устройств этот ConcentricRectangle работает на четыре с минусом (линия угла режется):

{% include img.html src="сoncentric-rectangle-17-pro.png" alt="Concentric rectangle на 17 Pro" %}

В итоге просто исправил таблицу вручную, проверив на каждом устройстве, а ConcentricRectangle убрал. Исправят ли проблему к официальному релизу iOS 26? Или на реальном iPhone Air всё будет по-другому?
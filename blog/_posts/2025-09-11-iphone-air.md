---
title: "О чём не знает iPhone Air"
description: "И почему иногда всё лучше делать самому"
tags: [iosdev]
draft: true
---

После презентации Apple решил узнать и добавить углы скругления экрана в [ScreenLines](https://screenlines.app){:target="_blank"} для новых устройств. Установил XCode RC и начал заполнять таблицу. 

Для определения радиуса используем значение скрытой переменной. При публикации в AppStore это нужно убрать, поэтому завернём в `#if Dubug`

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

![Радуисы скругления новых айфонов](/blog/img/2025-09-11-iphone-air/corners.png)
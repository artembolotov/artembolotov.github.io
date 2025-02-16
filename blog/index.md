---
layout: default
title: "Блог"
---

<h1>Блог</h1>
<ul>
  {% for post in site.posts %}
    <li>
      <h2><a href="{{ post.url }}">{{ post.title }}</a></h2> 
      ({{ post.date | date: "%d.%m.%Y" }})
      {% if post.description %}
        <p>{{ post.description }}</p>
      {% endif %}
    </li>
  {% endfor %}
</ul>

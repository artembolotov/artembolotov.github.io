---
layout: default
title: "Блог"
---

<h1>Блог</h1>

<main>
  <div class="posts">
  {% for post in site.posts %}
    <article>
      <h2><a href="{{ post.url }}">{{ post.title }}</a></h2> 
      <time datetime="{{ post.date }}">{{ post.date | date: "%d %B %Y" }}</time>
      {% if post.description %}
      <p>{{ post.description }}</p>
      {% endif %}
    </article>
  {% endfor %}
  </div>
</main>

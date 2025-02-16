---
layout: default
title: "Блог"
---

<h1>Блог</h1>

<main>
  <div class="posts">
  {% assign months = "января,февраля,марта,апреля,мая,июня,июля,августа,сентября,октября,ноября,декабря" | split: "," %}
  {% for post in site.posts %}
    <article>
      <h2><a href="{{ post.url }}">{{ post.title }}</a></h2> 
      {% assign month_index = post.date | date: "%-m" | minus: 1 %}
      <time datetime="{{ post.date }}">{{ post.date | date: "%d" }} {{ months[month_index] }} {{ post.date | date: "%Y" }}</time>
      {% if post.description %}
      <p>{{ post.description }}</p>
      {% endif %}
    </article>
  {% endfor %}
  </div>
</main>

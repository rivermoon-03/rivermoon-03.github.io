---
title: "Path Paramater, Query Parameter의 차이"
date: "2026-03-20 17:27:37 +0900"
categories: [개발]
tags: [개발]
---

# Path Paramater, Query Parameter의 차이

## Path Parameter
 `/page/1` 처럼 `/`로 특정한 리소스에 접근하는 것을 말한다. url 경로에 매개변수를 직접 포함하는 방식이다.

## Query Parameter
`/?id=3&category=develop` 처럼 파이썬의 dict 형태와 같이 키-값 쌍으로 매개변수를 제공하는 방식이다.

RESTful API에서 리소스를 식별하는 데에 사용하는 것은 Path Parameter 방식이다.

필수적으로 요구되는 값들을 받아야 할 때에는 Path Parameter을 사용하고, 필수가 아닌 값을 받을 때에는 Query Parameter 방식을 주로 사용한다고 한다.


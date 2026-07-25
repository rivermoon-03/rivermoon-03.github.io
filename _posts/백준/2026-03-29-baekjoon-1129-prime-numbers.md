---
title: "백준-1129-소수 구하기"
date: 2026-03-29 21:19:02 +0900
categories: [백준]
tags: [백준]
redirect_from:
  - /posts/백준-1129-소수-구하기/
---

[문제 링크](https://www.acmicpc.net/problem/1874)

## 코드 설계

 - **에라토스테네스의 체** 원리를 써야 한다.
  - 이렇게 안 하고 m부터 n까지 소수인지 아닌지 for i in range(m, n+1): 해서 i를 2~int(math.sqrt(i)) + 1까지로 나누어떨어지는지 아닌지로 판별하는 방식을 썼는데, 시간 초과가 일어났었다.


에라토스테네스의 체 방식을 간단하게 이야기하자면, "만약 n이 소수라면? -> n의 배수는 모두 소수가 아니다." 를 이용한 것이다.

- 2가 소수이므로 4, 6, 8, 10.. 은 소수가 아니고
- 3이 소수이므로 3, 6, 9.. 는 소수가 아니고..

이걸 그대로 코드로 잘 구현하기만 하면 쉽게 풀 수 있는 문제이다.

## 코드 작성

```Python

import math
import sys;
input = sys.stdin.readline

m, n = map(int, input().split())

numbers = [1] * (n + 1) # 인덱스를 편하게 세기 위해 0부터 n까지 소수인지 아닌지의 여부가 담긴 리스트
# 1이면 소수, 0이면 소수가 아니라는 것이다.
numbers[0] = 0 # 0, 1은 소수가 아니므로 패스.
numbers[1] = 0 # 0, 1은 소수가 아니므로 패스.

for i in range(2, int(math.sqrt(n)) + 1):
    if numbers[i]: # numbers[i] == 1
        for j in range(i * 2, n + 1, i):
            numbers[j] = 0

for n in range(m, len(numbers)):
    if numbers[n] == 1: print(n)
```
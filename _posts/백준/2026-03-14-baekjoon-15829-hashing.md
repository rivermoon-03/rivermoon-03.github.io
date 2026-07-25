---
title: 백준 - 15829번 - Hashing - Python
date: "2026-03-14 00:00:00 +0900"
categories: [백준]
tags: [백준]
toc: true
redirect_from:
  - /posts/백준-15829번-hashing-python/
---

[-> 백준 링크](https://www.acmicpc.net/problem/15829)

```python
# 입력부
word_len = int(input())
word = list(input())

# 문자 -> 숫자
for i in range(len(word)):
    word[i] = ord(word[i]) - 96

# 수식 구현
hash_sum = 0
for j in range(len(word)):
    hash_sum += word[j] * (31**j)

hash_sum %= 1234567891


# 출력부
print(hash_sum)
```

생각이 따로 필요 없는 문제였다.

공식이 문제에 적혀 있으니 그대로 따라가면 되었다.
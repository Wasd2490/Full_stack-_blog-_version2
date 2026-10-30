#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 V1 (Flask + SQLite) 导出数据为 JSON，供 V2 (Next.js + PostgreSQL) 导入使用。

用法：
    python scripts/export-sqlite.py [V1数据库路径] [输出JSON路径]

默认：
    源库  legacy/site.db
    输出  data/v1-export.json

说明：V1 的库经历过多次 ALTER 兼容，列可能缺失（如 posts.views/likes、users.avatar），
      脚本按 PRAGMA 实际列动态取值，缺失字段给默认值。
"""
import json
import os
import sqlite3
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASE, 'legacy', 'site.db')
DST = sys.argv[2] if len(sys.argv) > 2 else os.path.join(BASE, 'data', 'v1-export.json')


def columns(conn, table):
    """返回该表实际存在的列名集合（V1 库经历过多次 ALTER，列可能缺失）"""
    return {r[1] for r in conn.execute(f'PRAGMA table_info({table})').fetchall()}


def pick(row, cols, name, default=None):
    """按实际列名安全取值"""
    return row[name] if name in cols else default


def main():
    if not os.path.exists(SRC):
        print(f'[x] 找不到 V1 数据库: {SRC}')
        sys.exit(1)

    conn = sqlite3.connect(SRC)
    conn.row_factory = sqlite3.Row

    tables = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'").fetchall()}

    data = {'source': os.path.abspath(SRC), 'users': [], 'posts': [],
            'moments': [], 'comments': [], 'likes': []}

    # ---- users ----
    if 'users' in tables:
        cols = columns(conn, 'users')
        for r in conn.execute('SELECT * FROM users ORDER BY id'):
            row = dict(r)
            data['users'].append({
                'legacyId': row['id'],
                'email': row['email'],
                'nick': row['nick'],
                'password': row['pwd'],          # V1 为 sha256，导入后登录时自动升级为 scrypt
                'avatar': pick(row, cols, 'avatar', '') or '',
            })

    # ---- posts ----
    if 'posts' in tables:
        cols = columns(conn, 'posts')
        for r in conn.execute('SELECT * FROM posts ORDER BY id'):
            row = dict(r)
            data['posts'].append({
                'legacyId': row['id'],
                'uid': row['uid'],
                'title': row['title'],
                'cat': row.get('cat') or '默认',
                'content': row['content'],
                'excerpt': row.get('excerpt') or '',
                'date': row['date'],
                'views': pick(row, cols, 'views', 0) or 0,
                'likes': pick(row, cols, 'likes', 0) or 0,
                'sort': pick(row, cols, 'sort', 0) or 0,
            })

    # ---- moments ----
    if 'moments' in tables:
        for r in conn.execute('SELECT * FROM moments ORDER BY id'):
            row = dict(r)
            data['moments'].append({
                'legacyId': row['id'],
                'text': row.get('text') or '',
                'media': row.get('media') or '',
                'type': row.get('type') or '',
                'date': row['date'],
            })

    # ---- comments ----
    if 'comments' in tables:
        for r in conn.execute('SELECT * FROM comments ORDER BY id'):
            row = dict(r)
            data['comments'].append({
                'legacyId': row['id'],
                'targetType': row['target_type'],
                'targetId': row['target_id'],
                'nick': row['nick'],
                'avatar': row.get('avatar') or '',
                'content': row['content'],
                'date': row['date'],
            })

    # ---- likes ----
    if 'likes' in tables:
        for r in conn.execute('SELECT * FROM likes'):
            row = dict(r)
            data['likes'].append({'uid': row['uid'], 'postId': row['post_id']})

    conn.close()

    os.makedirs(os.path.dirname(DST), exist_ok=True)
    with open(DST, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f'[✓] 导出完成 -> {DST}')
    print(f'    users={len(data["users"])} posts={len(data["posts"])} '
          f'moments={len(data["moments"])} comments={len(data["comments"])} '
          f'likes={len(data["likes"])}')


if __name__ == '__main__':
    main()

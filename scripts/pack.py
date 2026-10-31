#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
工程打包脚本 —— 生成源码归档 zip（不含 node_modules 与构建产物）。

用法：
    python scripts/pack.py                # 轻量源码包，输出到 ../dist/
    python scripts/pack.py --with-media   # 含视频/音乐的完整包（文件名带 _full）
    python scripts/pack.py -o D:/backup   # 指定输出目录

规则：
    - 版本号取自 package.json 的 "version"
    - 排除依赖、构建产物、密钥文件、运行时数据与日志
    - 打包后打印文件数与体积，便于人工核对
"""

import argparse
import json
import os
import sys
import zipfile
from datetime import datetime
from pathlib import Path

# ── 排除规则 ────────────────────────────────────────────────
# 目录（按路径分段匹配，任意层级命中即排除）
EXCLUDE_DIRS = {
    'node_modules', '.next', '.git', 'out', 'build', 'dist',
    'data', 'uploads', '.vscode', '.idea', '__pycache__',
    '.workbuddy',
}
# 大体积媒体（视频背景 ~42MB + 音乐 ~45MB）。默认不打进源码包，
# 需要完整可跑的归档时用 --with-media 打开。
MEDIA_DIRS = {'videos', 'music'}
# 文件（按文件名匹配）
EXCLUDE_FILES = {
    '.env',                    # 含 SESSION_SECRET / 数据库口令
    '.env.local',
    'tsconfig.tsbuildinfo',
    'next-env.d.ts',           # Next.js 自动生成
    '.DS_Store',
}
# 后缀
EXCLUDE_SUFFIXES = {'.log', '.tmp', '.pyc'}


def should_skip(path: Path, root: Path) -> bool:
    rel = path.relative_to(root)
    parts = set(rel.parts)
    if parts & EXCLUDE_DIRS:
        return True
    if path.name in EXCLUDE_FILES:
        return True
    if path.suffix in EXCLUDE_SUFFIXES:
        return True
    return False


def read_version(root: Path) -> str:
    pkg = root / 'package.json'
    if not pkg.exists():
        return '0.0.0'
    try:
        return json.loads(pkg.read_text(encoding='utf-8')).get('version', '0.0.0')
    except Exception:
        return '0.0.0'


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    version = read_version(root)

    ap = argparse.ArgumentParser(description='打包博客 V2 源码')
    ap.add_argument('-o', '--out', default=str(root.parent / 'dist'),
                    help='输出目录，默认项目同级 dist/')
    ap.add_argument('--with-media', action='store_true',
                    help='连 public/videos 与 public/music 一起打包（约 +87MB）')
    args = ap.parse_args()

    skip_dirs = set(EXCLUDE_DIRS)
    if not args.with_media:
        skip_dirs |= MEDIA_DIRS

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now().strftime('%Y%m%d')
    # 含媒体的完整包加 _full 后缀，避免覆盖轻量源码包
    suffix = '_full' if args.with_media else ''
    zip_path = out_dir / f'my_blog_V{version}_src{suffix}_{stamp}.zip'

    files: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(root):
        cur = Path(dirpath)
        # 就地剪枝，避免走进大目录
        dirnames[:] = [d for d in dirnames
                       if d not in skip_dirs and not d.startswith('.git')]
        for name in filenames:
            f = cur / name
            if f == zip_path:
                continue
            if should_skip(f, root):
                continue
            files.append(f)

    files.sort(key=lambda p: str(p.relative_to(root)).lower())

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED,
                         compresslevel=6) as z:
        for f in files:
            z.write(f, f.relative_to(root).as_posix())

    size_mb = zip_path.stat().st_size / 1024 / 1024
    print(f'[pack] version   : {version}')
    print(f'[pack] files     : {len(files)}')
    print(f'[pack] output    : {zip_path}')
    print(f'[pack] size      : {size_mb:.2f} MB')
    if not args.with_media:
        print('[pack] note      : 已排除 public/videos 与 public/music（大媒体）。'
              '需要完整资源请加 --with-media，或手动复制这两个目录。')

    # 关键文件存在性自检
    must = ['package.json', 'README.md', 'CHANGELOG.md', '.env.example',
            'prisma/schema.prisma', 'app/page.tsx']
    missing = [m for m in must if not (root / m).exists()]
    if missing:
        print(f'[pack] WARNING 缺失关键文件: {missing}', file=sys.stderr)
        return 1
    if not any('legacy' in f.relative_to(root).as_posix().split('/')[0]
               for f in files):
        print('[pack] WARNING 未包含 legacy/（V1 回滚备份）', file=sys.stderr)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

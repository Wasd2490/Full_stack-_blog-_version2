"""谁暖了冬季 · 全站博客 V2 - Flask 后端"""
from flask import Flask, request, jsonify, send_from_directory, session, redirect

import sqlite3, hashlib, os, secrets, urllib.request, urllib.parse, json
from datetime import datetime

BASE = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=BASE, static_url_path='')
app.secret_key = secrets.token_hex(16)
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024

GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', 'Ov23liu9SSPzzokG7NmP')
GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', '540d05e6edc9f2d526da53b4174a549d7ad9344c')
GITHUB_CALLBACK = os.environ.get('GITHUB_CALLBACK', 'http://106.52.34.17:5000/auth/github/callback')

DB = os.path.join(BASE, 'site.db')

def init_db():
    c = sqlite3.connect(DB)
    c.executescript('''
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      nick TEXT NOT NULL,
      pwd TEXT NOT NULL,
      avatar TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS posts(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid INTEGER NOT NULL,
      title TEXT NOT NULL,
      cat TEXT DEFAULT '默认',
      content TEXT NOT NULL,
      excerpt TEXT,
      date TEXT NOT NULL,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS moments(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT,
      media TEXT,
      type TEXT,
      date TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS comments(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      nick TEXT NOT NULL,
      avatar TEXT,
      content TEXT NOT NULL,
      date TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS likes(
      uid INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      PRIMARY KEY(uid, post_id)
    );
    ''')
    # 兼容旧库
    for col, ddl in [
        ('sort', 'ALTER TABLE posts ADD COLUMN sort INTEGER DEFAULT 0'),
        ('views', 'ALTER TABLE posts ADD COLUMN views INTEGER DEFAULT 0'),
        ('likes', 'ALTER TABLE posts ADD COLUMN likes INTEGER DEFAULT 0'),
        ('avatar', 'ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ""'),
    ]:
        try: c.execute(ddl)
        except: pass
    c.commit(); c.close()

init_db()

def hash_pwd(p): return hashlib.sha256(p.encode()).hexdigest()

# 评分算法：浏览*0.1 + 点赞*3 + 评论*2
def calc_score(views, likes, comments):
    return round(views * 0.1 + likes * 3 + comments * 2, 1)

# ===== 用户 =====
@app.route('/api/register', methods=['POST'])
def register():
    d = request.json
    try:
        c = sqlite3.connect(DB)
        c.execute('INSERT INTO users(email,nick,pwd) VALUES(?,?,?)',
                  (d['email'], d.get('nick','新用户'), hash_pwd(d['pwd'])))
        c.commit(); c.close()
        return jsonify(ok=True)
    except Exception as e:
        return jsonify(ok=False, msg='邮箱已注册' if 'UNIQUE' in str(e) else str(e)), 400

@app.route('/api/login', methods=['POST'])
def login():
    d = request.json
    c = sqlite3.connect(DB)
    r = c.execute('SELECT id,nick,avatar FROM users WHERE email=? AND pwd=?',
                  (d['email'], hash_pwd(d['pwd']))).fetchone()
    c.close()
    if not r: return jsonify(ok=False, msg='账号或密码错误'), 401
    session['uid'] = r[0]; session['nick'] = r[1]; session['avatar'] = r[2] or ''
    return jsonify(ok=True, nick=r[1], avatar=r[2] or '')

@app.route('/api/logout')
def logout(): session.clear(); return jsonify(ok=True)

@app.route('/api/me')
def me():
    if 'uid' not in session: return jsonify(ok=False)
    return jsonify(ok=True, nick=session.get('nick'), avatar=session.get('avatar',''))

# ===== GitHub OAuth =====
@app.route('/auth/github')
def github_login():
    p = urllib.parse.urlencode({'client_id':GITHUB_CLIENT_ID, 'redirect_uri':GITHUB_CALLBACK, 'scope':'read:user user:email'})
    return redirect('https://github.com/login/oauth/authorize?'+p)

@app.route('/auth/github/callback')
def github_callback():
    code = request.args.get('code')
    data = urllib.parse.urlencode({'client_id':GITHUB_CLIENT_ID,'client_secret':GITHUB_CLIENT_SECRET,'code':code}).encode()
    req = urllib.request.Request('https://github.com/login/oauth/access_token', data=data, headers={'Accept':'application/json'})
    token = json.loads(urllib.request.urlopen(req).read())['access_token']
    req = urllib.request.Request('https://api.github.com/user', headers={'Authorization':'token '+token, 'User-Agent':'Wasd2490-blog'})
    u = json.loads(urllib.request.urlopen(req).read())
    c = sqlite3.connect(DB)
    email = u.get('email') or (u['login']+'@github.local')
    r = c.execute('SELECT id,nick,avatar FROM users WHERE email=?',(email,)).fetchone()
    if not r:
        c.execute('INSERT INTO users(email,nick,pwd,avatar) VALUES(?,?,?,?)',
                  (email,u['login'],hash_pwd(secrets.token_hex(8)),u.get('avatar_url','')))
        c.commit()
        r = c.execute('SELECT id,nick,avatar FROM users WHERE email=?',(email,)).fetchone()
    c.close()
    session['uid']=r[0]; session['nick']=r[1]; session['avatar']=r[2] or ''
    return redirect('/')

# ===== 文章 CRUD + 评分 =====
@app.route('/api/posts')
def list_posts():
    sort = request.args.get('sort', 'hot')  # hot=评分, new=最新
    c = sqlite3.connect(DB)
    if sort == 'new':
        rows = c.execute('''SELECT p.id,p.title,p.cat,p.excerpt,p.date,p.views,p.likes,u.nick,u.avatar,
                           (SELECT COUNT(*) FROM comments WHERE target_type='post' AND target_id=p.id) as cmt
                           FROM posts p LEFT JOIN users u ON p.uid=u.id
                           ORDER BY p.id DESC''').fetchall()
    else:
        rows = c.execute('''SELECT p.id,p.title,p.cat,p.excerpt,p.date,p.views,p.likes,u.nick,u.avatar,
                           (SELECT COUNT(*) FROM comments WHERE target_type='post' AND target_id=p.id) as cmt
                           FROM posts p LEFT JOIN users u ON p.uid=u.id
                           ORDER BY (p.views*0.1 + p.likes*3 + (SELECT COUNT(*) FROM comments WHERE target_type='post' AND target_id=p.id)*2) DESC, p.id DESC''').fetchall()
    c.close()
    result = []
    for r in rows:
        score = calc_score(r[5], r[6], r[9])
        result.append({'id':r[0],'title':r[1],'cat':r[2],'excerpt':r[3],'date':r[4],
                       'views':r[5],'likes':r[6],'author':r[7] or '谁暖了冬季','avatar':r[8] or '',
                       'comments':r[9],'score':score})
    return jsonify(result)

@app.route('/api/posts/<int:pid>')
def get_post(pid):
    c = sqlite3.connect(DB)
    # 浏览数+1
    c.execute('UPDATE posts SET views=views+1 WHERE id=?',(pid,))
    c.commit()
    r = c.execute('''SELECT p.title,p.cat,p.content,p.date,p.views,p.likes,u.nick,u.avatar,
                    (SELECT COUNT(*) FROM comments WHERE target_type='post' AND target_id=p.id) as cmt
                    FROM posts p LEFT JOIN users u ON p.uid=u.id WHERE p.id=?''',(pid,)).fetchone()
    liked = False
    if 'uid' in session:
        lr = c.execute('SELECT 1 FROM likes WHERE uid=? AND post_id=?',(session['uid'],pid)).fetchone()
        liked = bool(lr)
    c.close()
    if not r: return jsonify(ok=False),404
    return jsonify({'id':pid,'title':r[0],'cat':r[1],'content':r[2],'date':r[3],
                    'views':r[4],'likes':r[5],'author':r[6] or '谁暖了冬季','avatar':r[7] or '',
                    'comments':r[8],'liked':liked})

@app.route('/api/posts', methods=['POST'])
def add_post():
    d = request.json
    uid = session.get('uid', 1)
    c = sqlite3.connect(DB)
    c.execute('INSERT INTO posts(uid,title,cat,content,excerpt,date) VALUES(?,?,?,?,?,?)',
              (uid,d['title'],d.get('cat','默认'),d['content'],d.get('excerpt',''),datetime.now().strftime('%Y-%m-%d')))
    c.commit(); c.close()
    return jsonify(ok=True)

@app.route('/api/posts/<int:pid>', methods=['DELETE'])
def del_post(pid):
    c = sqlite3.connect(DB)
    c.execute('DELETE FROM posts WHERE id=?',(pid,))
    c.commit(); c.close()
    return jsonify(ok=True)

@app.route('/api/posts/<int:pid>', methods=['PUT'])
def update_post(pid):
    d = request.json
    c = sqlite3.connect(DB)
    c.execute('UPDATE posts SET title=?,cat=?,content=?,excerpt=? WHERE id=?',
              (d['title'],d.get('cat','默认'),d['content'],d.get('excerpt',''),pid))
    c.commit(); c.close()
    return jsonify(ok=True)

# 点赞/取消点赞
@app.route('/api/posts/<int:pid>/like', methods=['POST'])
def toggle_like(pid):
    if 'uid' not in session: return jsonify(ok=False,msg='请先登录'),401
    uid = session['uid']
    c = sqlite3.connect(DB)
    r = c.execute('SELECT 1 FROM likes WHERE uid=? AND post_id=?',(uid,pid)).fetchone()
    if r:
        c.execute('DELETE FROM likes WHERE uid=? AND post_id=?',(uid,pid))
        c.execute('UPDATE posts SET likes=likes-1 WHERE id=? AND likes>0',(pid,))
        liked = False
    else:
        c.execute('INSERT INTO likes(uid,post_id) VALUES(?,?)',(uid,pid))
        c.execute('UPDATE posts SET likes=likes+1 WHERE id=?',(pid,))
        liked = True
    c.commit()
    lr = c.execute('SELECT likes FROM posts WHERE id=?',(pid,)).fetchone()
    c.close()
    return jsonify(ok=True, liked=liked, likes=lr[0] if lr else 0)

# ===== 空间动态 =====
@app.route('/api/moments')
def get_moments():
    c = sqlite3.connect(DB)
    rows = c.execute('SELECT id,text,media,type,date FROM moments ORDER BY id DESC').fetchall()
    c.close()
    return jsonify([{'id':r[0],'text':r[1],'media':r[2],'type':r[3],'date':r[4]} for r in rows])

@app.route('/api/moments', methods=['POST'])
def add_moment():
    d = request.json
    c = sqlite3.connect(DB)
    c.execute('INSERT INTO moments(text,media,type,date) VALUES(?,?,?,?)',
              (d.get('text',''),d.get('media',''),d.get('type',''),datetime.now().strftime('%Y-%m-%d %H:%M')))
    c.commit(); c.close()
    return jsonify(ok=True)

@app.route('/api/moments/<int:mid>', methods=['DELETE'])
def del_moment(mid):
    c = sqlite3.connect(DB)
    c.execute('DELETE FROM moments WHERE id=?',(mid,))
    c.commit(); c.close()
    return jsonify(ok=True)

# ===== 评论 =====
@app.route('/api/comments/<ttype>/<tid>')
def get_comments(ttype,tid):
    c = sqlite3.connect(DB)
    rows = c.execute('SELECT nick,avatar,content,date FROM comments WHERE target_type=? AND target_id=? ORDER BY id',(ttype,tid)).fetchall()
    c.close()
    return jsonify([{'nick':r[0],'avatar':r[1],'content':r[2],'date':r[3]} for r in rows])

@app.route('/api/comments', methods=['POST'])
def add_comment():
    if 'uid' not in session: return jsonify(ok=False,msg='请先登录'),401
    d = request.json
    c = sqlite3.connect(DB)
    c.execute('INSERT INTO comments(target_type,target_id,nick,avatar,content,date) VALUES(?,?,?,?,?,?)',
              (d['ttype'],d['tid'],session.get('nick','新用户'),session.get('avatar',''),d['content'],datetime.now().strftime('%Y-%m-%d %H:%M')))
    c.commit(); c.close()
    return jsonify(ok=True)

# ===== GitHub API 代理 =====
@app.route('/api/github-proxy')
def github_proxy():
    target = request.args.get('url', '')
    if not target.startswith('https://api.github.com/') and not target.startswith('https://raw.githubusercontent.com/'):
        return 'bad url', 400
    req = urllib.request.Request(target, headers={
        'User-Agent': 'Wasd2490-blog',
        'Accept': 'application/vnd.github.v3+json'
    })
    try:
        data = urllib.request.urlopen(req, timeout=15).read()
        return app.response_class(data, mimetype='application/json')
    except Exception as e:
        return jsonify(error=str(e)), 502

@app.route('/api/github/repos')
def github_repos():
    url = 'https://api.github.com/users/Wasd2490/repos?sort=updated&per_page=20'
    req = urllib.request.Request(url, headers={'User-Agent': 'Wasd2490-blog', 'Accept': 'application/vnd.github.v3+json'})
    try:
        data = urllib.request.urlopen(req, timeout=10).read()
        return app.response_class(data, mimetype='application/json')
    except: return jsonify([]), 502

@app.route('/api/github/readme/<repo>')
def github_readme(repo):
    for branch in ['main', 'master']:
        url = f'https://raw.githubusercontent.com/Wasd2490/{repo}/{branch}/README.md'
        req = urllib.request.Request(url, headers={'User-Agent': 'Wasd2490-blog'})
        try:
            data = urllib.request.urlopen(req, timeout=10).read().decode('utf-8')
            return app.response_class(data, mimetype='text/plain; charset=utf-8')
        except: pass
    return app.response_class('# no README', mimetype='text/plain; charset=utf-8')

@app.route('/')
def home(): return send_from_directory(BASE,'index.html')

if __name__ == '__main__':
    import subprocess, time, urllib.request, json, os
    if os.name == 'nt':
        ngrok_path = r'C:\ngrok\ngrok.exe'
        if os.path.exists(ngrok_path):
            subprocess.Popen([ngrok_path, 'http', '5000'], creationflags=0x08000000)
    app.run(host='0.0.0.0', port=5000, debug=False)

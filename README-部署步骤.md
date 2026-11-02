# 后测部署清单（Tone-Perception-Post-Test）

这是一个**完全独立的**后测站点，前测仓库 `Tone-Perception-Pre-Test` 一个字都不用动。

- 结构：`practice.html`（8 题练习）→ `post.html`（40 题主测）
- 表格里 `testType` 写的是 `post-practice` / `post`，与后测数据天然隔离
- Apps Script 的 `/exec` 会多返回一个 `"testBuild":"post"`，用来确认你部署的不是前测那份

> ⚠️ **当前状态：8 + 40 题答案全部是占位 `[0, 0]`。** 因为后测换了新词表，答案得重新标。
> 占位未填时页面顶部会出现红条提示，所有作答会被记成 `Not scored`（数据会照样上传，但事后要手工判分）。
> 先把答案填好再正式跑。

---

## 第 1 步：建 GitHub 仓库

1. GitHub 右上角 **+ → New repository**
2. Repository name：`Tone-Perception-Post-Test`
3. 选 **Public**（GitHub Pages 免费版必须公开）
4. 勾 **Add a README file** → Create

## 第 2 步：上传这 7 个文件 + 音频

在仓库页点 **Add file → Upload files**，把这 7 个文件拖进去（**保持目录结构**）：

```
index.html
practice.html
post.html
assets/app.js
assets/config.js
assets/styles.css
apps-script-post.gs          ← 这个只是备份，不用给网页用
```

> `sheet-headers-*.tsv` 和 `后测答案填写模板.tsv` 不用上传。
> 上传 `assets/` 里的文件时，GitHub 网页端可以直接把整个 assets 文件夹拖进去。

**音频**：新建一个 `audio` 文件夹，把 48 个文件按下面命名放进去：

- 练习段 8 个：`Post_Practice (1).mp3` … `Post_Practice (8).mp3`
- 主测 40 个：`Post_Test (1).mp3` … `Post_Test (40).mp3`

（文件名里的空格必须保留，config.js 里已经按这个名字写好了。）

## 第 3 步：建新的 Google 表格

1. 新建一个空白 Google 表格，命名例如 **Tone Perception POST**
2. 菜单 **Extensions → Apps Script**
3. 全选删除原有代码，粘贴 `apps-script-post.gs` 的全部内容
4. **Ctrl+S 保存**（不保存函数列表不刷新）
5. 顶部函数下拉框选 `authorize` → **Run** → 授权（Review permissions → 账号 → Advanced → Go to project → Allow）
6. **Deploy → New deployment** → 齿轮图标选 **Web app**
   - Execute as：**Me**
   - Who has access：**Anyone**
   - 点 **Deploy**，复制那条以 `/exec` 结尾的网址

> 注意：一定是 **New deployment**，不要选 Manage deployments 里改旧的。

## 第 4 步：把网址填进 config.js

打开仓库里的 `assets/config.js`，点铅笔图标编辑，第 10 行左右：

```js
window.TONE_TEST_ENDPOINT = "";
```

把 `/exec` 网址粘进引号里 → **Commit changes**。

## 第 5 步：开启 GitHub Pages

仓库 **Settings → Pages** → Source 选 **Deploy from a branch** → Branch 选 **main** / **/ (root)** → Save。

等 1–2 分钟，地址是：

```
https://vivian4849.github.io/Tone-Perception-Post-Test/
```

## 第 6 步：验证（三步，别跳）

| 检查 | 怎么做 | 期望 |
|---|---|---|
| 后端活着 | 浏览器打开 `.../exec` | JSON 里有 `"version":8` 和 **`"testBuild":"post"`** |
| 后端能写 | 打开 `.../exec?probe=1` | `{"ok":true,...}`，表格里多一行又自动删掉 |
| 前端能跑 | 打开站点首页，填表 → 提交 | 跳到 `practice.html`，题目显示 `Item 1 of 8` |

如果第 1 步没看到 `testBuild":"post"`，说明你打开的是**前测**的部署，回头检查第 3 步。

## 第 7 步：填答案（关键）

打开 `后测答案填写模板.tsv`（Excel 可直接打开，48 行），填最后两列：

| section | index | audioFile | tone_of_syllable_1 | tone_of_syllable_2 |
|---|---|---|---|---|
| practice | 1 | audio/Post_Practice (1).mp3 | 3 | 4 |
| post | 1 | audio/Post_Test (1).mp3 | 2 | 1 |
| … | … | … | … | … |

填完发我，我直接生成改好的 `config.js` 给你覆盖；或者你自己按同样格式改文件里的 `answer: [0, 0]`。

## 第 8 步：给学生发链接

三个班就用三条链接（和前三场一样）：

```
.../index.html?session=1
.../index.html?session=2
.../index.html?session=3
```

---

## 数据在哪

| 位置 | 内容 |
|---|---|
| Google 表格 `responses` | 每个音节一行（28 列） |
| Google 表格 `submissions` | 每次提交一行（16 列） |
| 学生电脑下载的 CSV | `tone-test_post-practice_<姓名>_<时间>.csv` / `tone-test_post_<姓名>_<时间>.csv` |

分析时按 `question`（题目原始编号）统计，不要用 `shownAs`（那是学生看到的顺序）。

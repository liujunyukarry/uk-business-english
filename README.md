# 英国出差英语 · 学习与作品索引

本仓库以 **英国出差英语口语课程** 为主，同时保留历史 AI 学习资料和独立网页游戏。网站采用静态 HTML，可通过 GitHub Pages 访问。

## 网站入口

| 内容 | 文件或目录 | 说明 |
| --- | --- | --- |
| 英语课程首页 | [index.html](index.html) | 根据北京时间和 `course-plan.json` 自动选择当天课程，支持课程搜索 |
| 英语每日课程 | [day01.html](day01.html) 至 [day68.html](day68.html) | 历史课程与提前准备的课程；不覆盖原文件 |
| SAP FICO 英语手册 | [sap-fico-handbook.html](sap-fico-handbook.html) | 独立专题 |
| AI 学习历史归档 | [ai-learning/](ai-learning/) | 旧归档与索引；**不是当前 AI 日报的实时发布位置** |
| 2D 小狗游戏 | [paws-run-2d/](paws-run-2d/) | 独立游戏，保留原网页路径 |
| 3D 小狗游戏 | [paws-cloud-adventure-3d/](paws-cloud-adventure-3d/) | 独立游戏，保留原网页路径 |

GitHub Pages 英语主入口：<https://liujunyukarry.github.io/uk-business-english/>

历史旧版英语站点保留在独立仓库 [claude-english](https://github.com/liujunyukarry/claude-english)，**不作为现行每日课程入口**。

## 英语课程的数据与规则

- [course-plan.json](course-plan.json)：Day 编号、课程日期、场景标题和对应文件路径；目前登记 Day01–Day68，对应 2026-08-25 至 2026-10-31。
- [course-policy.md](course-policy.md)：课程内容与发布规则。更改课程生成方式前应先阅读此文件。
- [index.html](index.html)：英语总入口，运行时读取 `course-plan.json`。**不要每天改写首页来切换“今天练什么”**。
- [dayXX.html](day01.html)：每篇是独立页面，外部链接可能直接引用，**不要随意移动、重命名或覆盖历史文件**。
- [sw.js](sw.js)：已有的缓存处理脚本；是否离线可用应单独核实浏览器注册、缓存列表与部署行为，不能仅因文件存在就判定可离线。

当前 ChatGPT 例行任务（运行时间以任务设置为准）：
- 英语：北京时间 06:00，**只读核验**当天课程并通知；不在无人值守任务内发布或修改 GitHub 文件。
- AI 每日学习：北京时间 06:20，在聊天中直接交付最新 HTML；当前**不依赖本仓库**每日发布。

上面两条任务分别交付，不可把旧 `ai-learning/latest.html` 当成每天自动更新的实时内容。

## 修改与发布约束

1. 在任何文件迁移前，先列出受影响的相对链接、GitHub Pages 页面地址及定时任务读取路径。
2. 更改 `course-plan.json`、`dayXX.html` 或课程规则后，要校验对应日期、文件存在性、前后导航及移动端展示。
3. 不移动 `paws-run-2d/` 与 `paws-cloud-adventure-3d/`，除非已经处理所有资源相对路径与旧网页地址。
4. `ai-learning/` 目前作为历史资料保存；新内容若只需在聊天中交付，不应凭旧页面标题声称 GitHub 已发布。
5. 涉及定时任务**实际依赖的路径或规则**时，应同步修改对应 ChatGPT 任务提示词；纯文档补充、且依赖路径不变时不必重写任务。
6. 优先通过新分支及 Pull Request 审核代码、网页和目录迁移；勿无核验地批量删除、合并或重命名。

> 本次规范化仅清晰标记项目入口与维护边界，不改变课程、网页游戏和 AI 历史归档的现有相对路径。

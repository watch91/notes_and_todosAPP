## 本文件用于记录一些经常需要被修改的信息的文件的路径，以方便开发者以及其他协作者更好的找到并修改它们

---

#### 本文件记录的内容可能不完全
#### 所以若遇到要修改的文件的路径没有保存在本文件中，则十分抱歉，劳烦自行寻找


---

### 一、版本相关

储存前端软件当前软件版本号的路径：
```
/client/utils/version.ts
```

储存后端软件当前软件版本号的路径：
```
/server/src/version.ts
```

---

### 二、前端页面

首页（笔记广场）：
```
/client/screens/home.tsx
```

"我的"页面：
```
/client/screens/profile.tsx
```

笔记编辑页面：
```
/client/screens/note-edit.tsx
```

待办编辑页面：
```
/client/screens/todo-edit.tsx
```

小秘密页面：
```
/client/screens/secret.tsx
```

创意大厅页面：
```
/client/screens/creative-hall.tsx
```

星垂悟心页面：
```
/client/screens/starry-wisdom.tsx
```

设置页面：
```
/client/screens/settings.tsx
```

用户使用协议页面：
```
/client/screens/agreement.tsx
```

开发者模式页面：
```
/client/screens/dev-mode.tsx
```

问题反馈页面：
```
/client/screens/feedback.tsx
```

登录页面：
```
/client/screens/login.tsx
```

使用帮助页面（Q&A内容）：
```
/client/screens/help.tsx
```

---

### 三、前端配置

应用配置（主题、图标、名称等）：
```
/client/app.config.ts
```

主题模式配置（跟随系统/浅色/深色）：
```
/client/components/ColorSchemeUpdater.tsx
```

全局样式（设计系统、颜色变量等）：
```
/client/global.css
```

---

### 四、后端相关

后端入口文件：
```
/server/src/index.ts
```

笔记API：
```
/server/src/routes/notes.ts
```

待办API：
```
/server/src/routes/todos.ts
```

评论API：
```
/server/src/routes/comments.ts
```

用户API：
```
/server/src/routes/user.ts
```

版本配置API：
```
/server/src/routes/version.ts
```

问题反馈API：
```
/server/src/routes/feedback.ts
```

图片上传API：
```
/server/src/routes/upload.ts
```

LLM API：
```
/server/src/routes/llm.ts
```

公开API（供外部应用调用）：
```
/server/src/routes/public-api.ts
```

每日AI自动生成笔记任务：
```
/server/src/tasks/daily-notes.ts
```

---

### 五、其他

路由布局配置：
```
/client/app/_layout.tsx
```

Tab导航配置：
```
/client/app/(tabs)/_layout.tsx
```

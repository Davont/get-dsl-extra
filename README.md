# Get DSL Extra

Chrome 插件：通过口令获取并下载 DSL 文件。

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器（调试模式）
npm run dev

# 构建插件
npm run build
```

## 调试模式

运行 `npm run dev` 后，浏览器会打开 `debug.html`，模拟插件弹窗环境，方便调试 UI 和逻辑。

## 安装到 Chrome

1. 运行 `npm run build`
2. 打开 Chrome，进入 `chrome://extensions/`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」，选择 `dist` 目录

## 项目结构

```
src/
├── popup/          # 插件弹窗页面
├── background/     # Service Worker 后台服务
├── content/        # 内容脚本（注入网页）
├── core/           # 核心业务逻辑
└── debug.html      # 调试入口
public/
├── manifest.json   # Chrome 插件配置
└── icons/          # 插件图标
```

# 前端开发知识文档

## 一、HTML 基础

### 1.1 文档结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>页面标题</title>
  </head>
  <body>
    <!-- 页面内容 -->
  </body>
</html>
```

### 1.2 常用标签

- **语义化标签**: `header`, `nav`, `main`, `section`, `article`, `footer`, `aside`
- **表单元素**: `form`, `input`, `textarea`, `select`, `button`
- **多媒体**: `img`, `audio`, `video`
- **列表**: `ul`, `ol`, `li`, `dl`, `dt`, `dd`

### 1.3 重要属性

- `class`: 类选择器，可复用样式
- `id`: 唯一标识符
- `data-*`: 自定义数据属性
- `aria-*`: 无障碍属性

---

## 二、CSS 基础

### 2.1 选择器优先级

1. `!important`
2. 内联样式
3. ID 选择器 (#id)
4. 类选择器 (.class)、属性选择器、伪类
5. 元素选择器 (element)
6. 通配符 (\*)

### 2.2 盒模型

```css
.box {
  content-box: width + padding + border = 总宽度;
  border-box: width = 总宽度(包含padding和border);
}
```

### 2.3 Flexbox 布局

```css
.container {
  display: flex;
  flex-direction: row; /* 主轴方向 */
  justify-content: center; /* 主轴对齐 */
  align-items: center; /* 交叉轴对齐 */
  flex-wrap: wrap; /* 换行 */
}
```

### 2.4 Grid 布局

```css
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
```

### 2.5 响应式设计

```css
@media (max-width: 768px) {
  /* 移动端样式 */
}
```

---

## 三、JavaScript 核心

### 3.1 变量与数据类型

- **基本类型**: `string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint`
- **引用类型**: `object`, `array`, `function`

### 3.2 箭头函数

```javascript
const add = (a, b) => a + b;
```

### 3.3 解构赋值

```javascript
const { name, age } = person;
const [first, second] = array;
```

### 3.4 异步编程

```javascript
// Promise
fetch(url)
  .then((res) => res.json())
  .then((data) => console.log(data));

// async/await
async function getData() {
  const res = await fetch(url);
  const data = await res.json();
  return data;
}
```

### 3.5 数组方法

- `map()`: 转换数组
- `filter()`: 过滤元素
- `reduce()`: 累加计算
- `find()`: 查找元素
- `includes()`: 判断包含

---

## 四、ES6+ 特性

### 4.1 模块化

```javascript
// 导出
export const name = "value";
export default function () {}

// 导入
import { name } from "./module.js";
import Module from "./module.js";
```

### 4.2 类

```javascript
class Person {
  constructor(name) {
    this.name = name;
  }

  greet() {
    console.log(`Hello, ${this.name}`);
  }
}
```

### 4.3 扩展运算符

```javascript
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5]; // [1, 2, 3, 4, 5]
```

### 4.4 可选链与空值合并

```javascript
const name = user?.name ?? "Unknown";
```

---

## 五、前端框架

### 5.1 React

```jsx
function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>计数: {count}</p>
      <button onClick={() => setCount(count + 1)}>增加</button>
    </div>
  );
}
```

### 5.2 Vue

```vue
<template>
  <div>
    <p>计数: {{ count }}</p>
    <button @click="count++">增加</button>
  </div>
</template>

<script setup>
import { ref } from "vue";
const count = ref(0);
</script>
```

### 5.3 状态管理

- **React**: Redux, Zustand, Jotai
- **Vue**: Pinia, Vuex
- **通用**: Context API (React), Provide/Inject (Vue)

---

## 六、HTTP 与 API

### 6.1 HTTP 方法

- `GET`: 获取资源
- `POST`: 创建资源
- `PUT`: 更新资源（完整替换）
- `PATCH`: 更新资源（部分更新）
- `DELETE`: 删除资源

### 6.2 状态码

- `200 OK`: 请求成功
- `201 Created`: 创建成功
- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未授权
- `403 Forbidden`: 禁止访问
- `404 Not Found`: 资源不存在
- `500 Internal Server Error`: 服务器错误

### 6.3 Fetch API

```javascript
const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer token",
  },
  body: JSON.stringify(data),
});
```

---

## 七、性能优化

### 7.1 代码优化

- 减少 HTTP 请求
- 代码分割 (Code Splitting)
- 懒加载 (Lazy Loading)
- 图片优化 (WebP/AVIF)

### 7.2 缓存策略

- **强缓存**: `Cache-Control`, `Expires`
- **协商缓存**: `ETag`, `Last-Modified`

### 7.3 Webpack 优化

- Tree Shaking
- 按需加载
- 压缩混淆
- CDN 加速

---

## 八、安全

### 8.1 XSS 攻击

- 过滤用户输入
- 使用文本内容而非 innerHTML
- 设置 CSP (Content Security Policy)

### 8.2 CSRF 攻击

- 使用 CSRF Token
- 验证请求来源
- SameSite Cookie 属性

### 8.3 其他安全措施

- HTTPS
- 输入验证
- 密码加密存储
- 避免敏感信息泄露

---

## 九、开发工具

### 9.1 构建工具

- **Webpack**: 模块打包
- **Vite**: 快速开发构建
- **Rollup**: 库打包工具

### 9.2 代码质量

- **ESLint**: 代码规范检查
- **Prettier**: 代码格式化
- **TypeScript**: 类型检查

### 9.3 测试

- **Jest**: 单元测试
- **Cypress**: 端到端测试
- **React Testing Library**: 组件测试

---

## 十、最佳实践

### 10.1 代码规范

- 使用语义化标签
- 保持代码简洁
- 添加必要注释
- 统一命名规范

### 10.2 可维护性

- 模块化设计
- 组件复用
- 文档完善

### 10.3 无障碍访问

- 使用语义化 HTML
- 添加 alt 文本
- 键盘可访问性
- 适当的颜色对比度

---

## 十一、工具链命令

### 11.1 npm 命令

```bash
npm install          # 安装依赖
npm run build        # 构建项目
npm run dev          # 开发模式
npm test             # 运行测试
```

### 11.2 Git 命令

```bash
git add .            # 暂存所有文件
git commit -m "msg"  # 提交
git push             # 推送
git pull             # 拉取
```

---

## 总结

前端开发涉及 HTML、CSS、JavaScript 三大核心技术，配合现代框架和工具链，可以构建高性能、可维护的 Web 应用。持续学习和实践是提升前端技能的关键。

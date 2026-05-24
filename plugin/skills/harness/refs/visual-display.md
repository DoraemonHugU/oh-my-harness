# Visual display

## HTML 展示

用户明确要求用 HTML 展示时，直接产出单文件 HTML。
允许少量 JS，允许引入可靠 CDN 依赖，优先使用 bun 相关工具。
HTML 是给用户看的，风格保持简洁、清晰、偏 Apple 风。
预览默认使用 `live-server <html文件路径> --port=24310` 热刷新。

### D2 图表环境

当 HTML 中需要架构图时，统一使用 D2 DSL 渲染。
不要使用 Mermaid、Graphviz 或手写 SVG。
浏览器依赖固定为：

 提供d2图渲染能力转SVG 采用 `@terrastruct/d2` CDN 包。
 D2 图默认需要支持需要缩放/拖拽时，使用 `panzoom` CDN 绑定渲染后的 SVG。
 全屏库采用`screenfull` CDN，提供全屏功能。
```html

<script type="module">
import { D2 } from "https://esm.sh/@terrastruct/d2@0.1.33";
import Panzoom from "https://esm.sh/@panzoom/panzoom@4.6.0";
import screenfull from "https://esm.sh/screenfull@5.2.0";
</script>
```

### 默认设置
- D2 渲染后包一层 .diagram-viewport
- panzoom 绑定到 .diagram-viewport
- 每张图视窗高度调大到 clamp(520px, 72vh, 780px)
- SVG 最小宽度设为 980px，避免架构图被压得太窄
- 要按 viewBox 给 SVG 补真实像素尺寸。
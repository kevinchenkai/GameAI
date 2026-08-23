# StackPop BGM：windy 选段与加工记录

日期：2026-08-23

## 1. 源文件

- 文件：`/Users/kk/Datasets/Game/music/windy.mp3`
- ID3 标题：`微风轻起，我喜欢你`
- ID3 艺术家：`马路通`
- 时长：104.00 秒
- 编码：MP3 320 kbps，44.1 kHz，双声道
- 源文件大小：4,168,855 bytes

源文件前约 1.43 秒、末约 5.68 秒为静音。整曲约 -15.1 LUFS，
True Peak 约 -0.1 dBFS，不适合直接作为循环 BGM：文件偏大、首尾有静音，
且相对游戏音效过响。

## 2. 选段结论

选择源文件 `00:09.567` 至 `00:43.445`。

这一区间位于同一主体段落内，包含 96 个节拍检测网格（实际听感约 86 BPM），
总长 33.878 秒。与较明亮的 `01:01.463` 至 `01:24.079` 候选相比：

- 前者动态更舒缓，原始响度约 -15.8 LUFS；
- 后者约 -13.4 LUFS，内容更满，长时间循环更容易抢占三消音效；
- 前者长度更充足，单局内的重复感更低；
- 前者首尾的和声、频谱与能量更接近，适合制作循环。

## 3. 循环加工

没有直接在两个切点硬切。处理方式为：

1. 取上述 33.878 秒主体；
2. 用末尾 350 ms 与开头 350 ms 做等功感交叉淡化；
3. 将交叉段移到文件末尾，使解码后的文件可以直接循环；
4. 保持 44.1 kHz 双声道，不对有损源做无意义升采样；
5. 去掉源文件中的下载平台私有 ID3 comment；
6. 整体降低约 6.09 dB，目标约 -22 LUFS，并保留峰值余量。

加工后有效循环长度为 33.528 秒。

## 4. 正式文件

| 文件 | 编码 | 大小 | 实测响度 | True Peak | 用途 |
| --- | --- | ---: | ---: | ---: | --- |
| `windy_loop_v1.mp3` | MP3 128 kbps | 537,561 B | -22.3 LUFS | -6.8 dBFS | 主格式，兼容范围最稳 |
| `windy_loop_v1.m4a` | AAC 96 kbps | 409,486 B | -21.9 LUFS | -6.4 dBFS | 更小的备选格式 |

路径：`web/public/assets/audio/`

文件名带 `v1`，后续重新加工时必须使用 `v2` 等新文件名，避免线上 30 天静态缓存
继续命中旧音频。

## 5. 代码接入（已完成）

Asset Manifest 已登记两个版本，M4A 放在前面以优先节省约 24% 的传输量；
不支持 M4A 的设备由 Phaser 选择 MP3：

```ts
this.load.audio('bgm-windy-v1', [
  'assets/audio/windy_loop_v1.m4a',
  'assets/audio/windy_loop_v1.mp3',
]);
```

运行时参数：

- `loop: true`
- `volume: 0.20`
- 500 ms 淡入，避免首次交互解锁音频后突然出现音乐
- 关闭音乐时 180 ms 淡出并暂停，再开启时从原位置恢复
- 设置页的 `music` 开关只控制 BGM，不影响 `sound` 音效开关
- 必须复用 Phaser 的 `this.sound` / `this.sound.context`，不得新建 `AudioContext`
- 首页第一次有效点击后再播放，遵守 iPhone 自动播放限制
- 使用常驻 `BackgroundMusicScene`，切换页面时不会中断加载或重复创建实例

### 5.1 首屏加载策略

BGM **没有加入** `PreloadScene` / `PRELOAD_ASSETS`，不阻塞首屏纹理与首页渲染。

加载策略：

1. `HomeScene` 先完成 `renderHome()`；
2. 然后启动无显示对象的常驻 `BackgroundMusicScene`；
3. 默认在 800 ms 后启动独立 Phaser Loader；
4. 如果用户在 800 ms 内已点击，则立刻开始加载，不再等待；
5. 如果设置里音乐为关，则完全不发起音频请求；用户主动开启时才加载；
6. BGM Scene 在页面切换时保持运行，慢网络下从首页进入游戏也不会取消下载；
7. 浏览器按能力只下载 M4A/MP3 中的一份，不会下载两份。

本地真浏览器冷页面时序实测：

| 指标 | 时间 |
| --- | ---: |
| DOMContentLoaded | 227 ms |
| window load | 326 ms |
| BGM 请求开始 | 1,181 ms |
| BGM 响应完成 | 1,601 ms |
| 本次选择格式 | M4A |
| BGM 实际传输 | 409,786 B（含响应开销） |

BGM 请求晚于首屏 `load` 约 855 ms，不在首屏关键路径；BGM 下载及解码区间没有记录到
大于 50 ms 的 Long Task。首次点击解锁后，运行时检查为 `isPlaying=true`、
`loop=true`、`volume=0.20`。

### 5.2 防回归测试

- Asset Manifest 测试保证 BGM 永远不进入 `PRELOAD_ASSETS`
- 两份音频必须存在、文件名带版本号、单份小于 600 KB
- PreloadScene 源码不得调用 `load.audio`
- 全部 Scene 与 System 扫描不得出现 `new AudioContext()`
- 设置开关在真浏览器中验证淡出暂停与恢复播放

## 6. 权利确认

项目方已确认该音乐为已购素材，可用于个人开发。

原文件中的网易信息位于 ID3 `comment` 字段。加工时使用 `-map_metadata -1` 清除了
全部源 metadata，再只写入通用标题 `Windy Loop`。复核结果：

- MP3 只剩 `title=Windy Loop` 与 FFmpeg `encoder`；
- M4A 只剩容器兼容字段、`title=Windy Loop` 与 FFmpeg `encoder`；
- 艺术家、专辑、网易 `163 key` comment 均不存在。

因此发布文件不再携带可读取的网易 ID3 标记。这里指文件 metadata；若发行方在音频信号
中使用不可见的声学水印，常规 FFmpeg/ffprobe 无法证明其存在或不存在，但当前文件没有
发现这类水印的外部声明或可验证证据。

# 巴利语拼音输入法 · Pali Phonetic IME

输入发音（ASCII 罗马拼写），输出巴利文。
Type the **pronunciation** of Pali in plain ASCII and get proper Pali script.

**🌐 在线试用 · Live demo: https://juncoflockleader.github.io/pali-input/**
（可「安装」为 PWA，离线可用；会记住所选文字与智能纠正设置）

巴利语本身没有专属文字，历来用多种文字书写。本工具把易输入的拉丁拼写实时
转写为：

| 输出 | 说明 |
|------|------|
| **IAST** | 带变音符号的罗马转写（`buddhaṃ saraṇaṃ gacchāmi`）——学术与词典通用 |
| **देवनागरी** | 天城文——南亚学术、三藏校勘 |
| **සිංහල** | 僧伽罗文——斯里兰卡上座部 |
| **ไทย** | 泰文——泰国三藏传统 |
| **မြန်မာ** | 缅甸文——缅甸三藏传统（实验性，ṅ 连写的 kinzi 形为近似） |

## 桌面输入法 · Desktop IME

除了网页版,还能做成**系统级输入法**(在任何 app 里直接出巴利文),见
[`desktop/`](desktop/):

- **macOS**(原生 InputMethodKit / Swift):`cd desktop/macos && ./build.sh install`
  → 在「系统设置 → 键盘 → 输入法」启用「Pali」。引擎是 `pali.js` 的忠实 Swift 移植
  (28 项测试逐字对齐),菜单可切 5 种文字,光标旁有词义/词根浮窗 + 完整 DPD 词典。
- **iOS / iPadOS**(原生键盘扩展 / Swift):复用同一引擎,用 Xcode 建工程打包;见
  [`desktop/ios/`](desktop/ios/)。
- **Android**(原生 InputMethodService / Kotlin):引擎移植到 Kotlin(28 项 JVM 测试通过),
  Android Studio 打开 [`desktop/android/`](desktop/android/) 构建。
- **Windows 等**([Keyman](https://keyman.com)):5 个键盘源码(IAST + 天城/僧伽罗/
  泰/缅 4 种原生文字,后者由生成器从引擎字表生成并经规则模拟器逐字校验),用
  Keyman Developer 编译即得 Windows/macOS/Linux/web/移动端安装包。见
  [`desktop/keyman/`](desktop/keyman/)。

## 使用 · Usage

不需要任何构建步骤。

- **直接打开**：双击 `index.html` 即可在浏览器中使用（离线可用）。
- **或起一个本地服务器**（任选其一）：
  ```bash
  python3 -m http.server 8000
  # 然后访问 http://localhost:8000
  ```

## 输入方案 · Input scheme

整体沿用通行的 **Velthuis** ASCII 约定，并接受直接粘贴带变音符号的 IAST。

| 类别 | 输入 | 输出 |
|------|------|------|
| 长元音 Long vowels | `aa` `ii` `uu` | ā ī ū |
| 卷舌音 Retroflex | `.t` `.th` `.d` `.dh` `.n` `.l` | ṭ ṭh ḍ ḍh ṇ ḷ |
| 鼻音 ṅ (velar) | `"n`（或 `;n`） | ṅ |
| 鼻音 ñ (palatal) | `~n` | ñ |
| 随韵 Niggahīta ṃ | `.m` | ṃ |
| 送气 Aspirates | `kh gh ch jh th dh ph bh` | 同形 |

其余字母（`k g c j t d p b n m y r l v s h` 与 `a i u e o`）按读音直接输入。

## 构词提示 · Roots & next sounds

针对你**正在输入的那个词**，实时给出三类提示（见 [predict.js](predict.js)）：

1. **下一个音 Next sound**——基于真实巴利词/词根的**音级前缀预测**：把词库
   (词根各形 + 常用词)拆成 *akkhara*(巴利字音)序列,按你已输入的音做前缀
   匹配,统计并排序出最可能的下一个音。每个候选显示该音及其键入法,**点一下
   即追加**。库里无匹配时回退到**音系规则**(辅音后可接元音或合法的连写音等)。
2. **可能的词根 √dhātu**——匹配的[巴利词根](roots.js)(约 60 个),含英/中释义;
   也能通过现在式词干匹配(如输入 `pass` → √dis「见」),并**自动剥离前缀**
   (如 `anubudh` → upasagga `anu-` + √budh)。点一下填入该词。
3. **可能的前缀 upasagga**——20 个传统动词前缀,正在键入或已键入的都会列出。
4. **拆分 Analysis**——对正在输入的**整词**做形态拆解:
   `前缀 + 词根/词 + 词尾`,各部分配色并带释义。例如:
   - `dhammassa` → **dhamma**(法）+ **-assa**（属格·…的）
   - `anugacchati` → **anu-** + **√gam**（去）+ **-ti**（动词·他…）
   - `anattā` → **an-**（否定）+ **attā**（我）
   词尾用完整的 **vibhatti**(格/时态词尾)+ 常见 **kita/taddhita** 后缀表
   匹配(见 [roots.js](roots.js) 的 `ENDINGS`),词干再去 **685 个词根** + 词库里找。

音级匹配对鼻音做了**宽松处理**:你打的 `n` 可匹配 ṅ/ñ/ṇ(后接塞音会同化),
词尾 `m` 可匹配随韵 ṃ,所以半成词也能正确预测(如 `san` 会预测向 saṅkhāra)。

> **关于"100% 覆盖"**:前缀(upasagga 20 个)是封闭集,已 100%;词根已从
> [DPD 数据集](https://github.com/digitalpalidictionary/dpd-db)导入 **685 个**
> (英文释义来自 DPD,权威;其中 85 个有中文 + 现在式词干)——已覆盖 DPD 的全部
> 巴利词根。更重要的是,**词根+词缀 ≠ 翻译**:词义是词典化、常不可组合的,且大量词
> (虚词/代词/数词/专名/复合词)不由词根构成。所以本面板是**形态分析/教学**,真正的
> "翻译"覆盖取决于词库([glossary.js](glossary.js))的规模。

## 释义 · Meanings（英文 / 中文）

输出下方会**逐词显示英文与中文释义**：

- 收录约 200 条常用巴利词（核心教理术语、念诵常用词、虚词），见
  [glossary.js](glossary.js)。
- 自动归并常见的宾格/随韵词尾，如 `buddhaṃ → buddha`、`saraṇaṃ → saraṇa`。
- 对若干著名经偈给出**整句翻译**，例如：
  - `buddhaṃ saraṇaṃ gacchāmi` → “I go to the Buddha for refuge. 我皈依佛。”
  - `sabbe sattā sukhī hontu` → “May all beings be happy. 愿一切众生快乐。”

释义仅为常用词教学辅助，非完整词典，未收录的词显示为“—”。

### 智能纠正 Smart correction（默认开启）

按巴利正字法自动纠正鼻音，让你可以直接按读音敲键盘；界面会**显示纠正内容**
（如 `buddham → buddhaṃ`）。

**1. 鼻音同化**——`n` 随后面的塞音同部位同化：

| 你输入 | 自动得到 | |
|--------|----------|---|
| `sangha` | saṅgha | n + 软腭音 → ṅ |
| `panca` | pañca | n + 硬腭音 → ñ |
| `dan.da` | daṇḍa | n + 卷舌音 → ṇ |
| `sambodhi` | sambodhi | n + 唇音 → m |

`n` 后接齿音时不变（`danta` → danta、`ananda` → ananda）。

**2. 词尾随韵**——巴利词尾的 `m` 必为随韵 ṃ，故自动补点：

| 你输入 | 自动得到 |
|--------|----------|
| `buddham` | buddhaṃ |
| `evam` | evaṃ |
| `dhammam` | dhammaṃ |

仅纠正**词尾**的 m；词中的 m 不动，以免误改叠辅音（`kamma` 保持 kamma）
或 m+元音（`metta` 保持 metta）。

若要保留随韵写法（如 `saṃgha`），请用 `.m`：`sa.mgha` → saṃgha。
可在界面上关闭“智能纠正”以禁用上述全部行为。

## 示例 · Examples

| 输入 | IAST |
|------|------|
| `buddha.m sara.na.m gacchaami` | buddhaṃ saraṇaṃ gacchāmi |
| `namo tassa bhagavato` | namo tassa bhagavato |
| `sabbe sattaa sukhii hontu` | sabbe sattā sukhī hontu |
| `aniccaa vata sa"nkhaaraa` | aniccā vata saṅkhārā |

## 结构 · Architecture

```
pali-ime/
├── index.html   界面结构
├── styles.css   样式
├── app.js       界面逻辑（实时转写、标签页、复制、构词提示、逐词释义）
├── pali.js      转写引擎（无依赖，浏览器 + Node 双用）
├── glossary.js  巴利词 → 英文 / 中文 词库（约 200 条 + 经偈整句）
├── roots.data.js  生成：685 个词根（DPD 导入 + 中文），勿手改
├── roots.js     前缀 upasagga（20）+ 词尾 vibhatti/后缀（42）+ 加载 roots.data.js
├── predict.js   下一音预测 + 词根/前缀匹配 + 词形拆解器（akkhara 级引擎）
├── tools/       DPD 导入管线（build-roots.mjs + curated-roots.mjs + 缓存）
├── test.js      验证（95 项：转写 + 词库 + 预测 + 拆解）
└── README.md
```

转写引擎是纯函数管线：

```
tokenize(text) → [音素 tokens] → render<Script>(tokens)
```

每个音素 token 以规范的 IAST 字母为内部表示，并标注类型
（元音 / 辅音 / 随韵 / 透传）。各文字的渲染器共用一个通用的
**元音附标文字（abugida）** 算法：辅音自带固有元音 `a`，其他元音用附标替换，
辅音连写用 virama 叠写，词首元音用独立形。泰文额外处理前置元音 `เ/โ` 的重排。

## 词根数据管线 · Root data pipeline

词根来自 **[Digital Pāḷi Dictionary (dpd-db)](https://github.com/digitalpalidictionary/dpd-db)**
（授权 CC BY-NC-SA）。`roots.data.js` 由脚本生成,**请勿手改**;重建步骤:

```bash
# 1) 拉取 DPD 词根表（TSV）
curl -sS -o tools/dpd_cache/dpd_roots.tsv \
  https://raw.githubusercontent.com/digitalpalidictionary/dpd-db/main/db/backup_tsv/dpd_roots_part_001.tsv

# 2) 合并 DPD 英文释义 + 我们的中文/词干，生成 roots.data.js
node tools/build-roots.mjs        # => 685 roots (85 中文, 600 English-only)
```

- 英文释义(`root_meaning`)取自 DPD,权威。
- 中文与动词现在式词干来自 [tools/curated-roots.mjs](tools/curated-roots.mjs)(我们维护),
  在合并时叠加到对应词根上。
- 同名异组的词根会按裸词根去重、合并义项。

> **未做的扩词库**:DPD 另有约 8 万词条(headwords),但体量太大、且仅英文,
> 不适合塞进纯前端页面。翻译词库仍由 [glossary.js](glossary.js) 人工维护双语,可逐步扩充。

## 测试 · Tests

```bash
node test.js   # 95 passed, 0 failed
```

测试覆盖五种文字的已知正确写法（如 buddha→बुद्ध / බුද්ධ / พุทฺธ / ဗုဒ္ဓ）。

## 已知限制 · Known limitations

- **缅甸文**为实验性：ṅ 在辅音连写中的 *kinzi*（င်္）形式以普通叠写近似，
  个别词形可能与传统排版略有出入；其余写法正确。
- 引擎面向标准巴利音系；不处理梵语特有音（ṛ ṝ ḹ ś ṣ ḥ 等）。

## 路线图与许可 · Roadmap & License

- 后续改进计划见 [ROADMAP.md](ROADMAP.md)。
- **代码**采用 **MIT**（[LICENSE](LICENSE)）。
- **打包的 DPD 数据**（`roots.data.js`、`dpd-dict.json`）来自
  [Digital Pāḷi Dictionary](https://github.com/digitalpalidictionary/dpd-db)，
  采用 **CC BY-NC-SA**（非商业 + 相同方式共享）——详见 [NOTICE.md](NOTICE.md)。
  含该数据的发行版为非商业用途；纯 MIT / 可商用构建需移除 DPD 数据（仅保留人工词库）。

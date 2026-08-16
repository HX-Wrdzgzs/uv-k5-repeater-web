# 固件公开发布边界

公开上传的固件包不包含个人自定义尾音资源：

- `tails.bin`
- `tails.stable.bin`

这两个文件只属于维护者自己的本地使用场景，不进入网站下载包、GitHub Release 或其他公开分发目录。发布打包脚本使用白名单复制文件，因此其他未列入白名单的本地文件也不会被带出。

固件本体中的“自定义尾音”功能入口保留不变。这里删除的是尾音资源文件，不是菜单入口、配置项或固件功能；用户仍然可以在自己的本地构建中放入个人尾音资源。

打包时不会修改固件源目录，也不会删除维护者本地的 `tails.bin` / `tails.stable.bin`。执行：

```bash
node scripts/package-firmware-release.mjs --source H:/uv-k5-wrdzgzs-frw --output H:/uv-k5-public-release
```

如果输出目录之前残留了上述两个文件，脚本只会清理输出目录中的这两个明确列出的私有资源，不会清理其他文件。

## 当前公开包

`public/releases/LOSEHU132-bin-20260816-public/` 是当前网站发布的无私人尾音包，包含：

- `firmware.bin`
- `firmware.packed.bin`
- `firmware.stable.bin`
- `firmware.stable.packed.bin`
- `repeaters.bin`
- `repeaters_manifest.json`
- `repeaters.build.json`

其中 `repeaters.bin` 使用 2026-08-11 截图整理后的 K5DB v3 数据，包含 960 条模拟记录；`tails.bin` 和 `tails.stable.bin` 均不在公开目录中。上传前应检查 `SHA256SUMS.txt`，并确认固件下载包没有尾音资源文件。

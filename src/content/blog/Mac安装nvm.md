---
title: "Mac 安装 nvm"
description: "Mac 安装 nvm"
pubDate: "2022-02-13"
heroImage: "https://res.cloudinary.com/practicaldev/image/fetch/s--4BjMqsdN--/c_imagga_scale,f_auto,fl_progressive,h_420,q_auto,w_1000/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/4anecy5mdl4pho8w7519.jpg"
---

# 一、NVM是什么？

**nvm(node version manager)是一个用于管理nodejs版本的工具**。有时我们的项目可能会依赖于不同版本的nodejs，需要进行node版本的切换，可能就是到官网下载、覆盖安装、当要回退时又得下载会原来版本、覆盖安装...这样子太麻烦了。那么nvm就是为解决这个问题而生的，**让你方便快捷地切换node版本**。

# 二、删除本地node

> 安装nvm前先记住当前已安装的node版本号、然后将其卸载删除。
>
> 原因：
>
> - 清除多余的node环境，用nvm集中管理node；
> - 避免出现冲突

依次在终端执行以下命令，删除node

```bash
sudo npm uninstall npm -g

sudo rm -rf /usr/local/lib/node /usr/local/lib/node_modules /var/db/receipts/org.nodejs.*

sudo rm -rf /usr/local/include/node /Users/$USER/.npm

sudo rm /usr/local/bin/node

sudo rm /usr/local/share/man/man1/node.1

sudo rm /usr/local/lib/dtrace/node.d
```

然后检查下：

```bash
node  //command not found

npm  //command not found
```

# 三、安装nvm

> 注意：不要使用 `Homebrew` 安装 `nvm`，这个在 `nvm` 的官方文档中有说明。

首先打开终端，进入当前用户的 `home` 目录中。

```bash
cd ~/
```

然后使用 `ls -a` 显示这个目录下的所有文件（夹）（包含隐藏文件及文件夹），查看有没有 `.bash_profile` 这个文件。

```bash
ls -a
```

如果没有，则新建一个。

```bash
touch ~/.bash_profile
```

目前nvm最新版本v0.34.0，要查看当前最新请前往[nvm GitHub发布地址]([https://github.com/nvm-sh/nvm])

>  这里可能会出现 443的报错，原因是GFW的原因，这里最方便的办法是走代理（[方法)](https://zhuanlan.zhihu.com/p/115450863)）

```bash
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.39.1/install.sh | bash
```

或者

```bash
wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.39.1/install.sh | bash
```

在安装完成后，也许你会在终端输入 `nvm` 验证有没有安装成功，这个时候你会发现终端打出 `Command not found`，其实这并不是没有安装成功，你只需要重启终端就行，再输入 `nvm` 就会出现 `Node Version Manager` 帮助文档，这表明你安装成功了。

> 注意：
>
> - 不要使用 `homebrew` 安装 `nvm`
>
> - 如果你是MacOS 10.15版本以后默认命令会不可用（最新的 `macOS Catalina` 系统（即版本 10.15 及之后）默认的 `shell` 是 `zsh`，不在是 `bash`），这里有两种解决办法：
>
>   - 我们需要将默认 `shell` 改为 `bash`，具体参见苹果官网的相关文章 [如何更改默认 Shell](https://link.segmentfault.com/?enc=ca2rLPuAb7gG0bOBOCjK6w%3D%3D.ZiSgGnxG1k9KWNuRcbtSKhrKUi%2FCiusJjPZLeHxviUHKab5UDN6iVfva3X5I0%2BHG)，如果你之前就习惯使用 `zsh` 也可自行配置。
>
>   - 如果你要使用 `zsh` 终端，那么在上述方式安装完之后，在 `.bash_profile` 同一目录下创建一个 `.zshrc` 文件，使用 `vim` 打开文件添加下面两句话，重启终端即可。
>
>     ```bash
>     export NVM_DIR="$HOME/.nvm"
>     [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
>     [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
>     ```
>
> - 保证 `Mac` 中安装了 `git`，一般只要你下载了 `Mac` 的 `Xcode` 开发工具，它是自带 `git` 的。[安装方法](https://www.xiaojueshi.top/archives/macinstallgit)

# 四、nvm的主要命令

- **nvm install stable** // 安装最新稳定版 node（当前最新稳定版11.6.0）
- **nvm install <version>** // 安装指定版本 (install v10.15.0或install 10.15.0)
- **nvm uninstall <version>** // 卸载指定版本node,（如果删除的为当前使用版本，要解绑，则执行 nvm deactivate）
- **nvm use <version>** // 切换使用指定的版本node
- **nvm current** //显示当前使用的版本
- **nvm ls** //列出所有安装的版本
- **nvm ls-remote** //列出官网上node的所有版本
- **nvm alias <name> <version>** //给不同的版本号添加别名
- **nvm unalias <name>** //删除已定义的别名
- **nvm alias default <version>** //指定默认版本（设定后需要打开新的终端才生效）
- **nvm deactivate** //解除当前版本绑定
- .....更多命令可在终端输入 **nvm** 查看

> - 所有的不同版本的node都安装在**~/.nvm/version/node/**目录下
> - 要删除卸载nvm直接将**整个.nvm文件**夹删除就ok了。

# 五、参考

[在 Mac 下安装 nvm 管理 node（解决版） - SegmentFault 思否](https://segmentfault.com/a/1190000017391932)

[nvm的安装与使用（Mac 版） - SegmentFault 思否](https://segmentfault.com/a/1190000017881215)

[Failed to connect to raw.githubusercontent.com:443 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/115450863)
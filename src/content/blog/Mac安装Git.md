---
title: "Mac 安装 Git"
description: "Mac 安装 Git"
pubDate: "2022-02-13"
heroImage: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTjlCmX5IKZj0TvFkNUlXRvG9gNgWcyZuXxpw08Vv5-ptY6glzlhUXosTfHXELxsXXHSSc&usqp=CAU"
---

# 一、安装Git

> Git有两种安装方式：
>
> - 通过homebrew安装Git
> - 通过Xcode安装Git

## 1. 通过homebrew安装Git

### 1.1 未安装homebrew，需安装homebrew

安装命令如下：

~~~bash
/bin/bash -c "$(curl -fsSL https://cdn.jsdelivr.net/gh/ineo6/homebrew-install/install.sh)"
~~~

### 1.2 安装Git

~~~bash
brew install git
~~~

## 2. 通过Xcode安装

直接从AppStore安装Xcode，Xcode集成了Git，不过默认没有安装。

- 你需要运行Xcode，选择菜单“Xcode”->“Preferences”；
- 在弹出窗口中找到“Downloads”；
- 选择“Command Line Tools”；
- 点“Install”就可以完成安装了。

**你可以通过输入 `git` 来检测Git是否安装成功**

# 二、 创建ssh key

## 1. 设置username和email（github每次commit都会记录他们）

~~~bash
git config --global user.name "你GitHub或gitee的昵称"
git config --global user.email "你GitHub或gitee的邮箱"
# 注意不要省略双引号
~~~

## 2. 通过终端命令创建ssh key

~~~bash
ssh-keygen -t rsa -C "你GitHub或gitee的邮箱“
~~~

一路回车，需要同意的同意，需要输入密码输入你的mac密码

查看密钥：

~~~bash
cat .ssh/id_rsa.pub
~~~

> 关于如何配置GitHub和Gitee与Windows一样，网上也有教程
>
> 注意：你已经生成了密钥不需要重复生成，直接使用即可
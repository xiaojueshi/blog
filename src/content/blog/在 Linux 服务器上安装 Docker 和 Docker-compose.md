---
title: "在 Linux 服务器上安装 Docker 和 Docker-compose"
description: "在 Linux 服务器上安装 Docker 和 Docker-compose"
pubDate: "2022-01-22"
heroImage: "https://www.biaopan8.com/wp-content/uploads/2021/09/c2ef15c914e173b.jpeg"
---

# 前言
一般来说著名的linux系统基本上分两大类：
- RedHat系列：Redhat、Centos、Fedora等
- Debian系列：Debian、Ubuntu等

其中 RedHat 系列的包管理工具为`yum`，Debian 系列的包管理工具为`apt-get`。
本文章将采用 Debian 系列的 Linux 系统，采用`apt-get`包管理工具。
如果你使用的是 RedHat 系列的 Linux 系统，可以安装`apt-get`包管理工具，或直接使用`yum`，两者并无较大的差别。
# 本文章操作环境
操作系统：Debian；
操作账号：root （大部分命令都需要 root 权限）
# 更新安装必备软件
~~~bash
apt-get update && apt-get install -y wget curl
~~~
# 安装 Docker
Docker 的官网已经为我们提供了 Dokcer 的安装脚本，我们只需要在命令行中执行下面的命令就可以了（由于有的小伙伴服务器在中国大陆，所以这里也提供了中国大陆镜像的安装命令）。
~~~bash
wget -qO- get.docker.com | bash		# Docker 官方，推荐使用
# or
wget -qO- get.daocloud.io/docker | bash	# 中国大陆镜像，实在不行再使用
~~~
执行了上方的命令，Dokcer 就安装完成了。
## 检测 Docker 版本，测试 Docker 是否安装成功
~~~bash
docker -v	# 查看 Docker 版本
~~~
## 设置 Docker 的开机自启
~~~bash
systemctl enable docker
~~~
# 卸载 Docker
当然这里也为小伙伴们提供了卸载命令，依次执行一下命令：
~~~bash
apt-get purge docker-ce docker-ce-cli containerd.io
rm -rf /var/lib/docker
rm -rf /var/lib/containerd
~~~
# 安装 Docker-compose 
这里也为小伙伴们，提供了两条命令，二选一即可：
## 下载 Docker-compose 
~~~bash
curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose		# 推荐非中国大陆地区
# or
curl -L https://get.daocloud.io/docker/compose/releases/download/1.24.0/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose		# 中国大陆地区镜像
~~~
## 赋予 Docker-compose 执行权限
~~~bash
chmod +x /usr/local/bin/docker-compose
~~~
## 检测 Docker-compose  版本，测试 Docker-compose 是否安装成功
~~~bash
docker-compose --version
~~~
# 尾言
好了，这样我们就在 Linux 服务器上安装了 Docker 和 Docker-compose。
Docker 是一个非常好用的项目部署的工具，我也是刚接触到 Docker。以后，我还是会在分享一些好用的 Docker 项目（感谢各位大佬的付出）。
那么这一章就完结了！*★,°*:.☆(￣▽￣)/$:*.°★* 。
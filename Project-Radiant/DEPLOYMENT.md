# 阿里云服务器部署指南

本指南将帮助您将 **AI驱动的个性化学习路径定制系统** 部署到阿里云服务器。

## 📋 部署信息

- **服务器IP**：8.159.151.36
- **操作系统**：Ubuntu
- **域名**：ai4teaching.cn
- **项目仓库**：https://github.com/wzfzyjcj/ATDemo.git

---

## 🚀 部署步骤

### 第一步：连接服务器

使用SSH连接到您的阿里云服务器：

```bash
# Windows用户使用PowerShell或Git Bash
# Mac/Linux用户使用终端
ssh root@8.159.151.36
```

输入服务器密码后登录成功。

---

### 第二步：安装基础环境

#### 1. 更新系统软件包

```bash
# 更新软件包列表
sudo apt update

# 升级已安装的软件包
sudo apt upgrade -y
```

#### 2. 安装 Node.js 和 npm

```bash
# 安装 Node.js 20.x LTS版本
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node -v   # 应该显示 v20.x.x
npm -v    # 应该显示 10.x.x
```

#### 3. 安装 Nginx

```bash
# 安装 Nginx
sudo apt install -y nginx

# 启动 Nginx
sudo systemctl start nginx

# 设置开机自启
sudo systemctl enable nginx

# 检查状态
sudo systemctl status nginx
```

#### 4. 安装 Git

```bash
# 安装 Git
sudo apt install -y git

# 验证安装
git --version
```

---

### 第三步：克隆并构建项目

#### 1. 创建项目目录

```bash
# 创建网站根目录
sudo mkdir -p /var/www

# 进入目录
cd /var/www
```

#### 2. 克隆项目

```bash
# 克隆GitHub项目
sudo git clone https://github.com/wzfzyjcj/ATDemo.git ai4teaching

# 进入项目目录
cd ai4teaching

# 查看文件
ls -la
```

#### 3. 安装依赖

```bash
# 安装项目依赖
sudo npm install

# 如果遇到权限问题，使用：
# sudo npm install --unsafe-perm=true --allow-root
```

#### 4. 构建生产版本

```bash
# 构建项目
sudo npm run build

# 构建完成后会在 dist 目录生成静态文件
ls -la dist/
```

---

### 第四步：配置 Nginx

#### 1. 创建 Nginx 配置文件

```bash
# 创建站点配置文件
sudo nano /etc/nginx/sites-available/ai4teaching.cn
```

#### 2. 添加以下配置内容

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name ai4teaching.cn www.ai4teaching.cn 8.159.151.36;
    
    root /var/www/ai4teaching/dist;
    index index.html;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
    
    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # 日志
    access_log /var/log/nginx/ai4teaching_access.log;
    error_log /var/log/nginx/ai4teaching_error.log;
}
```

按 `Ctrl + O` 保存，`Ctrl + X` 退出。

#### 3. 启用站点配置

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/ai4teaching.cn /etc/nginx/sites-enabled/

# 删除默认站点（可选）
sudo rm /etc/nginx/sites-enabled/default

# 测试配置文件
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx
```

---

### 第五步：配置域名解析

#### 在阿里云域名控制台配置：

1. 登录 [阿里云域名控制台](https://dns.console.aliyun.com/)
2. 找到域名 `ai4teaching.cn`
3. 添加以下DNS记录：

| 记录类型 | 主机记录 | 记录值 | TTL |
|---------|---------|--------|-----|
| A | @ | 8.159.151.36 | 10分钟 |
| A | www | 8.159.151.36 | 10分钟 |

等待DNS解析生效（通常5-10分钟）。

#### 验证DNS解析

```bash
# 在本地电脑测试
ping ai4teaching.cn
ping www.ai4teaching.cn

# 应该解析到 8.159.151.36
```

---

### 第六步：配置阿里云安全组

确保阿里云安全组开放以下端口：

1. 登录 [阿里云ECS控制台](https://ecs.console.aliyun.com/)
2. 进入实例详情 → 安全组
3. 配置规则，添加入方向规则：

| 端口范围 | 协议 | 授权对象 | 说明 |
|---------|------|---------|------|
| 22 | TCP | 0.0.0.0/0 | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP |
| 443 | TCP | 0.0.0.0/0 | HTTPS |

---

### 第七步：配置 HTTPS（SSL证书）

#### 方法一：使用 Let's Encrypt 免费证书（推荐）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 自动配置 SSL
sudo certbot --nginx -d ai4teaching.cn -d www.ai4teaching.cn

# 按提示输入邮箱，同意条款
# Certbot 会自动修改 Nginx 配置并配置证书

# 测试自动续期
sudo certbot renew --dry-run
```

#### 方法二：使用阿里云SSL证书

1. 在阿里云申请免费SSL证书
2. 下载 Nginx 格式证书
3. 上传到服务器 `/etc/nginx/ssl/` 目录
4. 修改 Nginx 配置：

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    server_name ai4teaching.cn www.ai4teaching.cn;
    
    ssl_certificate /etc/nginx/ssl/ai4teaching.cn.pem;
    ssl_certificate_key /etc/nginx/ssl/ai4teaching.cn.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    root /var/www/ai4teaching/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ai4teaching.cn www.ai4teaching.cn;
    return 301 https://$server_name$request_uri;
}
```

---

### 第八步：设置服务器防火墙（可选）

```bash
# 安装 UFW
sudo apt install -y ufw

# 允许 SSH
sudo ufw allow 22/tcp

# 允许 HTTP 和 HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

---

## 🔄 项目更新流程

当GitHub仓库有更新时，按以下步骤更新服务器：

```bash
# 1. 进入项目目录
cd /var/www/ai4teaching

# 2. 拉取最新代码
sudo git pull origin main

# 3. 安装新依赖（如果有）
sudo npm install

# 4. 重新构建
sudo npm run build

# 5. 重启 Nginx（可选）
sudo systemctl reload nginx
```

### 创建自动更新脚本

```bash
# 创建更新脚本
sudo nano /usr/local/bin/update-ai4teaching.sh
```

添加以下内容：

```bash
#!/bin/bash

echo "🔄 开始更新 AI4Teaching 项目..."

cd /var/www/ai4teaching

echo "📥 拉取最新代码..."
git pull origin main

echo "📦 安装依赖..."
npm install

echo "🏗️ 构建项目..."
npm run build

echo "🔄 重载 Nginx..."
systemctl reload nginx

echo "✅ 更新完成！"
echo "🌐 访问: https://ai4teaching.cn"
```

设置权限并执行：

```bash
# 添加执行权限
sudo chmod +x /usr/local/bin/update-ai4teaching.sh

# 执行更新
sudo /usr/local/bin/update-ai4teaching.sh
```

---

## 📊 监控与维护

### 查看 Nginx 日志

```bash
# 查看访问日志
sudo tail -f /var/log/nginx/ai4teaching_access.log

# 查看错误日志
sudo tail -f /var/log/nginx/ai4teaching_error.log
```

### 查看 Nginx 状态

```bash
# 检查 Nginx 状态
sudo systemctl status nginx

# 重启 Nginx
sudo systemctl restart nginx

# 重新加载配置
sudo systemctl reload nginx
```

### 磁盘空间监控

```bash
# 查看磁盘使用情况
df -h

# 查看目录大小
du -sh /var/www/ai4teaching
```

---

## 🐛 常见问题排查

### 1. 访问网站显示 502 Bad Gateway

```bash
# 检查 Nginx 配置
sudo nginx -t

# 查看错误日志
sudo tail -50 /var/log/nginx/error.log

# 重启 Nginx
sudo systemctl restart nginx
```

### 2. 域名无法访问

```bash
# 检查DNS解析
ping ai4teaching.cn

# 检查端口是否开放
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# 检查阿里云安全组规则
```

### 3. SSL证书问题

```bash
# 检查证书状态
sudo certbot certificates

# 手动续期证书
sudo certbot renew

# 测试SSL配置
curl -I https://ai4teaching.cn
```

### 4. 项目构建失败

```bash
# 清除缓存
sudo npm cache clean --force

# 删除 node_modules 重新安装
sudo rm -rf node_modules package-lock.json
sudo npm install

# 检查 Node.js 版本
node -v  # 需要 >= 16.x
```

---

## 🎯 验证部署

部署完成后，访问以下地址验证：

- **HTTP**: http://8.159.151.36
- **HTTP**: http://ai4teaching.cn
- **HTTPS**: https://ai4teaching.cn

应该能看到登录页面，可以使用任意用户名密码登录体验系统。

---

## 📈 性能优化建议

### 1. 启用 Gzip 压缩

已在 Nginx 配置中启用，可进一步优化：

```nginx
gzip_comp_level 6;
gzip_buffers 16 8k;
gzip_http_version 1.1;
```

### 2. 配置浏览器缓存

已在 Nginx 配置中设置静态资源缓存30天。

### 3. 使用 CDN（可选）

可以将静态资源（CSS、JS、图片）上传到阿里云OSS，配置CDN加速。

### 4. 开启 HTTP/2

确保 Nginx 配置中有 `http2` 标志：

```nginx
listen 443 ssl http2;
```

---

## 🔐 安全加固建议

### 1. 修改 SSH 端口

```bash
sudo nano /etc/ssh/sshd_config
# 修改: Port 22 -> Port 2222
sudo systemctl restart sshd
```

### 2. 禁用 root 登录

```bash
# 创建普通用户
sudo adduser deploy
sudo usermod -aG sudo deploy

# 禁用 root SSH 登录
sudo nano /etc/ssh/sshd_config
# 修改: PermitRootLogin no
```

### 3. 安装 Fail2ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 📞 技术支持

如果遇到问题，可以：

1. 查看项目 [GitHub Issues](https://github.com/wzfzyjcj/ATDemo/issues)
2. 参考 [Nginx 官方文档](https://nginx.org/en/docs/)
3. 查看 [阿里云帮助文档](https://help.aliyun.com/)

---

<div align="center">

**🎉 恭喜！您的网站已成功部署！**

访问 **https://ai4teaching.cn** 开始使用

</div>


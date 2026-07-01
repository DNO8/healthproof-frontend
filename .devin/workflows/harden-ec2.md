---
description: Hardening de seguridad del nodo EC2 Hygieia (Avalanche L1)
---

# Hardening del Nodo Hygieia EC2

Este workflow asegura el nodo EC2 donde corre Hygieia (Avalanche L1) después de que la IP fue expuesta en commits de git.

## Pre-requisitos

- Acceso SSH al nodo EC2 (IP 3.141.110.34)
- AWS CLI configurado o acceso a AWS Console
- Usuario con privilegios `sudo` en el nodo

## Pasos

### 1. Preparar sesión SSH

Conecta al nodo con tu key pair:

```bash
ssh -i tu-key.pem ubuntu@3.141.110.34
```

// turbo
### 2. Configurar Security Groups AWS

En AWS Console → EC2 → Security Groups:

1. Elimina la regla SSH (22) con origen `0.0.0.0/0`
2. Agrega SSH (2222) con origen `TU_IP/32`
3. Elimina RPC (9650) con origen `0.0.0.0/0` (si existe)
4. Agrega HTTP (80) y HTTPS (443) según necesidad

// turbo
### 3. SSH Hardening

```bash
# Backup de config original
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

# Cambiar puerto y deshabilitar root/password
sudo sed -i 's/^#\?Port .*/Port 2222/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?X11Forwarding .*/X11Forwarding no/' /etc/ssh/sshd_config

echo "AllowUsers ubuntu" | sudo tee -a /etc/ssh/sshd_config
echo "Banner /etc/ssh/banner" | sudo tee -a /etc/ssh/sshd_config
echo "WARNING: Unauthorized access prohibited." | sudo tee /etc/ssh/banner

# Reiniciar SSH
sudo systemctl restart sshd

# Verificar en NUEVA sesión (NO cierres la actual aún)
ssh -p 2222 -i tu-key.pem ubuntu@3.141.110.34
```

// turbo
### 4. Firewall UFW

```bash
sudo apt update
sudo apt install ufw -y
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 2222/tcp comment 'SSH'
sudo ufw allow 9651/tcp comment 'Avalanche P2P'
sudo ufw allow 80/tcp comment 'Nginx'
sudo ufw allow 443/tcp comment 'Nginx TLS'
sudo ufw enable
sudo ufw status verbose
```

// turbo
### 5. Avalanche Node Hardening

```bash
sudo mkdir -p ~/.avalanchego
sudo nano ~/.avalanchego/config.json
```

Pega la configuración segura:

```json
{
  "api-admin-enabled": false,
  "api-keystore-enabled": false,
  "http-host": "127.0.0.1",
  "http-port": 9654,
  "staking-port": 9651,
  "http-allowed-hosts": ["localhost", "127.0.0.1"],
  "http-allowed-origins": ["*"]
}
```

Reinicia:

```bash
# Si usas systemd:
sudo systemctl restart avalanchego

# Si usas screen/tmux o lo lanzaste con avalanche-cli, detén y reinicia el proceso:
ps aux | grep avalanchego | grep -v grep | awk '{print $2}' | xargs sudo kill -9 2>/dev/null
nohup avalanchego --config-file=$HOME/.avalanchego/config.json > /dev/null 2>&1 &
```

// turbo
### 6. Nginx Reverse Proxy

```bash
sudo apt install nginx -y
sudo tee /etc/nginx/sites-available/hygieia-rpc << 'EOF'
limit_req_zone $binary_remote_addr zone=rpc_limit:10m rate=10r/s;
server {
    listen 80;
    access_log /var/log/nginx/hygieia-access.log;
    error_log /var/log/nginx/hygieia-error.log;
    location / {
        limit_req zone=rpc_limit burst=20 nodelay;
        proxy_pass http://127.0.0.1:9650;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-Content-Type-Options "nosniff";
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/hygieia-rpc /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

// turbo
### 7. Fail2ban

```bash
sudo apt install fail2ban -y
sudo tee /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 2222
maxretry = 3
bantime = 86400
EOF
sudo systemctl restart fail2ban
sudo fail2ban-client status
```

// turbo
### 8. Auto-updates

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

// turbo
### 9. Verificación Final

Desde tu máquina local:

```bash
# Test 1: SSH funciona en puerto 2222
ssh -p 2222 -i tu-key.pem ubuntu@3.141.110.34

# Test 2: RPC via Nginx responde
curl -X POST http://3.141.110.34/ext/bc/2qXqVm6f7B8LeMt4Gxa7V39LW8YVQiRuhzqH57Vaik9dD4VPRq/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Test 3: Admin API bloqueada (debe fallar desde externo)
curl http://3.141.110.34:9650/ext/admin 2>/dev/null | grep -q "404\|403\|refused" && echo "OK - Admin bloqueado"
```

// turbo
### 10. (Opcional) Elastic IP nueva

En AWS Console → EC2 → Elastic IPs:

1. Allocate new Elastic IP address
2. Associate with tu instancia (reemplaza la IP actual)
3. La IP antigua queda libre y sin relación con tu infra
4. Actualiza `NEXT_PUBLIC_RPC_URL` en Vercel/producción

// turbo
### 11. (Opcional) AWS ALB + Subnet Privada

Para producción hard-core:

1. Crea VPC con subnet pública y privada
2. Mueve el EC2 a subnet privada (sin IP pública)
3. Crea ALB en subnet pública
4. Apunta ALB → EC2 privado
5. Agrega AWS WAF al ALB
6. El RPC externo pasa solo por ALB/WAF

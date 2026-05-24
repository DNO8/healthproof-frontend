# Hardening del Nodo Hygieia (EC2) — Guía de Seguridad

Esta guía detalla todos los pasos necesarios para asegurar el nodo EC2 donde corre Hygieia (Avalanche L1), mitigando el riesgo de que la IP pública expuesta en commits anteriores sea utilizada para ataques.

---

## Tabla de Contenidos

- [1. AWS Security Groups](#1-aws-security-groups)
- [2. SSH Hardening](#2-ssh-hardening)
- [3. Firewall Local (UFW)](#3-firewall-local-ufw)
- [4. Avalanche Node Config](#4-avalanche-node-config)
- [5. Reverse Proxy (Nginx)](#5-reverse-proxy-nginx)
- [6. Fail2ban](#6-fail2ban)
- [7. Monitoreo y Alertas](#7-monitoreo-y-alertas)
- [8. Actualizaciones Automáticas](#8-actualizaciones-automáticas)
- [9. Checklist Final](#9-checklist-final)

---

## 1. AWS Security Groups

### Acceder a EC2 Console → Security Groups → Edit inbound rules

**REGLAS ACTUALES (ANTES):**
| Type | Protocol | Port Range | Source | Descripción |
|------|----------|------------|--------|-------------|
| SSH | TCP | 22 | 0.0.0.0/0 | SSH abierto al mundo |
| Custom TCP | TCP | 9650 | 0.0.0.0/0 | Avalanche API |
| Custom TCP | TCP | 9651 | 0.0.0.0/0 | Avalanche P2P |

**REGLAS NUEVAS (DESPUÉS):**
| Type | Protocol | Port Range | Source | Descripción |
|------|----------|------------|--------|-------------|
| SSH | TCP | **2222** | **TU_IP_PERSONAL/32** | SSH solo desde tu IP |
| Custom TCP | TCP | 9650 | **TU_IP_PERSONAL/32** | RPC solo desde tu IP |
| Custom TCP | TCP | 9651 | 0.0.0.0/0 | P2P (requerido para red) |
| HTTP | TCP | 80 | **TU_IP_PERSONAL/32** o ALB | Nginx proxy |
| HTTPS | TCP | 443 | **TU_IP_PERSONAL/32** o ALB | Nginx proxy TLS |

**Acciones:**
```bash
# Obtener tu IP pública actual
curl ifconfig.me

# En AWS Console, reemplaza todas las reglas con 0.0.0.0/0 excepto P2P
# SSH debe usar puerto 2222 (ver sección 2)
# RPC (9650) solo desde IPs confiables o a través de ALB/CloudFront
```

> **IMPORTANTE:** Elimina COMPLETAMENTE la regla de puerto 22 con 0.0.0.0/0. No la dejes "por si acaso".

---

## 2. SSH Hardening

Conecta al nodo vía SSH y ejecuta:

```bash
sudo nano /etc/ssh/sshd_config
```

**Modifica/Agrega estas líneas:**
```
Port 2222
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AllowUsers ubuntu          # o tu usuario específico
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 30
X11Forwarding no
Banner /etc/ssh/banner
```

**Crea un banner de advertencia:**
```bash
echo "WARNING: Unauthorized access to this system is prohibited. All activities are monitored and recorded." | sudo tee /etc/ssh/banner
```

**Reinicia SSH:**
```bash
sudo systemctl restart sshd
```

**Verifica conexión en nuevo puerto:**
```bash
ssh -p 2222 -i tu-key.pem ubuntu@3.141.110.34
```

> **NO cierres la sesión actual hasta verificar que funciona en el nuevo puerto.**

---

## 3. Firewall Local (UFW)

```bash
# Instalar si no está presente
sudo apt update && sudo apt install ufw -y

# Política por defecto: negar todo
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir solo lo necesario
sudo ufw allow 2222/tcp comment 'SSH hardened'
sudo ufw allow 9651/tcp comment 'Avalanche P2P'
sudo ufw allow 80/tcp comment 'Nginx HTTP proxy'
sudo ufw allow 443/tcp comment 'Nginx HTTPS proxy'

# Opcional: permitir RPC solo desde IP específica
# sudo ufw allow from TU_IP to any port 9650 proto tcp

# Si necesitas acceso RPC desde frontend público, NO abras 9650 directamente.
# Usa Nginx reverse proxy (sección 5) con rate limiting.

# Activar firewall
sudo ufw enable

# Verificar estado
sudo ufw status verbose
```

---

## 4. Avalanche Node Config

El nodo Avalanche tiene APIs que NO deben ser públicas.

**Editar configuración del nodo:**
```bash
sudo nano ~/.avalanchego/config.json
```

**Configuración mínima segura:**
```json
{
  "api-admin-enabled": false,
  "api-auth-required": false,
  "api-health-enabled": true,
  "api-info-enabled": true,
  "api-keystore-enabled": false,
  "api-metrics-enabled": true,
  "api-ipcs-enabled": false,
  "http-host": "127.0.0.1",
  "http-port": 9650,
  "staking-port": 9651,
  "http-allowed-hosts": ["localhost", "127.0.0.1"],
  "http-allowed-origins": ["http://localhost:3000"],
  "api-max-blocks-per-request": 30,
  "consensus-shutdown-timeout": 60000000000,
  "db-dir": "db"
}
```

**Explicación:**
- `api-admin-enabled: false` — Nadie puede administrar el nodo remotamente
- `api-keystore-enabled: false` — Nadie puede acceder a wallets del nodo
- `http-host: 127.0.0.1` — La API solo escucha en localhost
- `http-allowed-origins` — CORS restringido

> **Con `http-host: 127.0.0.1`, el RPC solo es accesible desde el mismo servidor.** El acceso externo pasa obligatoriamente por Nginx (sección 5).

**Reiniciar nodo:**
```bash
sudo systemctl restart avalanchego
# o si usas screen/tmux:
# pkill avalanchego && ./avalanchego --config-file ~/.avalanchego/config.json
```

---

## 5. Reverse Proxy (Nginx)

Instalar Nginx como único punto de entrada al RPC, con rate limiting y logging:

```bash
sudo apt install nginx -y
```

**Crear configuración:**
```bash
sudo nano /etc/nginx/sites-available/hygieia-rpc
```

```nginx
# Rate limiting zone
limit_req_zone $binary_remote_addr zone=rpc_limit:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=addr:10m;

server {
    listen 80;
    server_name _;

    # Logs detallados
    access_log /var/log/nginx/hygieia-access.log;
    error_log /var/log/nginx/hygieia-error.log;

    # Bloquear methods peligrosos
    if ($request_method !~ ^(GET|POST)$ ) {
        return 444;
    }

    location / {
        # Rate limiting
        limit_req zone=rpc_limit burst=20 nodelay;
        limit_conn addr 10;

        # Proxy a Avalanche (solo localhost)
        proxy_pass http://127.0.0.1:9650;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;

        # Tamaño máximo de body
        client_max_body_size 1m;

        # Headers de seguridad
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }
}
```

**Activar:**
```bash
sudo ln -sf /etc/nginx/sites-available/hygieia-rpc /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

**Ahora el RPC externo es accesible por HTTP 80 en lugar de 9650 directamente**, con rate limiting y protección de methods.

### Opcional: TLS con Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d hygieia-rpc.tudominio.com --agree-tos -m tu@email.com
```

> Si no tienes dominio, al menos considera usar AWS ACM + ALB para TLS.

---

## 6. Fail2ban

```bash
sudo apt install fail2ban -y
```

**Crear jail local:**
```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = 2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/hygieia-error.log
maxretry = 10
findtime = 60
bantime = 3600
```

**Crear filtro para nginx:**
```bash
sudo nano /etc/fail2ban/filter.d/nginx-limit-req.conf
```

```
[Definition]
failregex = limiting requests, excess:.* by zone.*client <HOST>
```

**Reiniciar:**
```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

---

## 7. Monitoreo y Alertas

### Instalar CloudWatch agent (si usas AWS)

```bash
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb
```

**Configurar logs:**
```bash
sudo nano /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/auth.log",
            "log_group_name": "hygieia-auth",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/nginx/hygieia-access.log",
            "log_group_name": "hygieia-rpc-access",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/nginx/hygieia-error.log",
            "log_group_name": "hygieia-rpc-error",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
```

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

### Alertas básicas con logwatch (opcional)

```bash
sudo apt install logwatch -y
```

---

## 8. Actualizaciones Automáticas

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

**Configurar:**
```bash
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

Asegúrate de que estas líneas estén descomentadas:
```
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESM:${distro_codename}-apps-security";
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
```

---

## 9. Checklist Final

Antes de considerar el nodo seguro, verifica cada ítem:

- [ ] Security Group: Puerto 22 (SSH) eliminado o restringido a tu IP
- [ ] Security Group: Puerto 9650 (RPC) eliminado de reglas públicas
- [ ] Security Group: Puerto 2222 (SSH nuevo) restringido a tu IP
- [ ] SSH: Puerto cambiado a 2222
- [ ] SSH: Root login deshabilitado
- [ ] SSH: Solo key-based auth (no password)
- [ ] SSH: Banner de advertencia activo
- [ ] UFW: Activado y solo permite 2222, 9651, 80, 443
- [ ] Avalanche: `api-admin-enabled: false`
- [ ] Avalanche: `api-keystore-enabled: false`
- [ ] Avalanche: `http-host: 127.0.0.1`
- [ ] Nginx: Instalado y configurado como reverse proxy
- [ ] Nginx: Rate limiting activo (10 req/s)
- [ ] Nginx: Métodos HTTP restringidos (GET/POST only)
- [ ] Nginx: Logs habilitados en `/var/log/nginx/hygieia-*.log`
- [ ] Fail2ban: Activado para SSH y Nginx
- [ ] Fail2ban: Ban funciona (prueba con fail2ban-client)
- [ ] CloudWatch: Logs enviando a CloudWatch
- [ ] Auto-updates: `unattended-upgrades` configurado
- [ ] Test: RPC funciona a través de Nginx (`curl http://IP/ext/bc/.../rpc`)
- [ ] Test: SSH directo a puerto 2222 funciona desde tu máquina
- [ ] Test: SSH en puerto 22 rechaza conexiones (desde otra IP)
- [ ] Test: Acceso a `api-admin` devuelve 403 o connection refused
- [ ] Test: `api-keystore` no responde en red pública

---

## Notas Adicionales

### Cambiar la IP del nodo (opcional)

Si quieres eliminar completamente el riesgo de la IP expuesta:

1. Crea una **Elastic IP nueva** en AWS
2. Asóciala a la instancia EC2 (reemplaza la IP actual)
3. Actualiza el `RPC_URL` en tu `.env` de producción
4. La IP antigua quedará libre y sin relación con tu infraestructura

> Costo de Elastic IP: ~$0.005/hora cuando NO está asociada a una instancia en ejecución. Cuando está asociada y en uso, es gratis.

### Usar AWS ALB + CloudFront (recomendado para producción)

Para máxima seguridad:
- Coloca un **Application Load Balancer** delante del EC2
- Usa **AWS WAF** en el ALB para protección contra DDoS y SQLi
- Usa **CloudFront** como CDN/WAF adicional
- El EC2 vive en una **subnet privada** sin IP pública
- Solo el ALB (en subnet pública) expone el RPC

Esto elimina completamente la necesidad de que el EC2 tenga IP pública.

---

## Referencias

- [Avalanche Node Security](https://docs.avax.network/nodes/build/setting-up-node-monitoring)
- [AWS EC2 Security Best Practices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security.html)
- [Nginx Rate Limiting](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html)

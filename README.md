# Node.js Docker + PostgreSQL CI/CD demo

Практичне заняття 9: контейнеризація Node.js-застосунку, тег Docker-образу за коротким Git commit hash, публікація в Docker Hub і автоматичне розгортання на Ubuntu EC2 через Docker Compose. Проєкт також містить необов’язкову частину з PostgreSQL.

## Що входить до проєкту

- `Dockerfile` на офіційному `node:lts`; спочатку копіює `package*.json`, виконує `npm install`, потім копіює решту проєкту, збирає застосунок і запускає його через Node.
- `.dockerignore` виключає `node_modules`, `.env`, Git-файли, секретні ключі та локальний build output.
- `docker-compose.yml` запускає `app` і `postgres:15`. PostgreSQL має healthcheck, named volume для даних і доступний із хоста лише через `127.0.0.1:5432`.
- Node.js застосунок підключається до PostgreSQL через `pg`, повторює підключення під час старту і записує в лог `PostgreSQL connection successful.` Endpoint `/api/db` перевіряє живе з'єднання.
- `.github/workflows/ci.yml` тестує застосунок, будує та публікує образ із тегами гілки і короткого commit hash. Після push у `main` GitHub Actions розгортає образ на EC2 через Compose.
- `scripts/install-docker-ec2.sh` встановлює Docker Engine і Compose Plugin з офіційного репозиторію Docker; `scripts/deploy-ec2.sh` прибирає старі процеси PM2, виконує `docker rm -f nodeapp || true`, завантажує образ і запускає Compose.

## Передумови

Для локальної перевірки потрібні Git, Node.js/npm та Docker Desktop (Windows) або Docker Engine з Docker Compose v2. Для CI/CD додатково потрібні публічний GitHub-репозиторій, Docker Hub account/token і Ubuntu EC2 instance з SSH-доступом.

## Локальний запуск у Windows PowerShell

У корені репозиторію:

```powershell
Copy-Item .env.example .env
notepad .env
```

У `.env` заміни `POSTGRES_PASSWORD` на локальний довгий пароль (краще літери й цифри, без пробілів). Щоб тег відповідав зміненому проєкту, спершу закоміть ці зміни; тоді задай ім'я Docker Hub користувача й хеш останнього коміту:

```powershell
$env:DOCKERHUB_USERNAME = 'your-dockerhub-user'
$env:IMAGE_TAG = (git rev-parse --short HEAD).Trim()
$Image = "$($env:DOCKERHUB_USERNAME)/nodeapp:$($env:IMAGE_TAG)"
docker build -t $Image .
```

Compose читає `DOCKERHUB_USERNAME` та `IMAGE_TAG` з PowerShell environment, а `POSTGRES_PASSWORD` — із `.env`:

```powershell
docker compose up -d --no-build
docker compose ps
docker compose logs -f app db
```

Перевір застосунок і базу:

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/healthz'
Invoke-RestMethod -Uri 'http://localhost:3000/api/db'
Start-Process 'http://localhost:3000'
```

У `/api/db` має бути `status: connected`; у логах app — повідомлення про успішне з'єднання PostgreSQL. Для зупинки без видалення даних виконай `docker compose down`. Щоб скинути локальну базу повністю, виконай `docker compose down -v` — це видалить named volume з її даними.

### Ручна збірка та push

Після локальної збірки можна авторизуватися в Docker Hub (введи access token за запитом) і відправити образ:

```powershell
docker login -u $env:DOCKERHUB_USERNAME
docker push $Image
```

Зверни увагу: `git rev-parse --short HEAD` працює у клонованому Git-репозиторії з commit history.

## Публікація у наявний GitHub-репозиторій

Працюй у локальному clone саме того публічного репозиторію, який треба здати. Якщо розпакував цей пакет окремо, скопіюй його файли у clone, не додаючи `.env` чи `.pem`. Потім у PowerShell:

```powershell
git status
git add .
git commit -m "Add Docker Compose and CI pipeline"
git push origin main
```

Після push у `main` запуститься Docker Hub build/push, а потім EC2 deployment. `git rev-parse --short HEAD` працює лише всередині Git clone з історією комітів.

## GitHub Actions

У GitHub-репозиторії відкрий **Settings → Secrets and variables → Actions → New repository secret** і створи такі secrets:

| Secret | Значення |
| --- | --- |
| `DOCKERHUB_USERNAME` | Ім'я користувача Docker Hub |
| `DOCKERHUB_TOKEN` | Docker Hub Personal Access Token з правами Read/Write |
| `EC2_HOST` | Публічний IPv4 або DNS EC2 |
| `EC2_USER` | SSH-користувач; для стандартного Ubuntu AMI зазвичай `ubuntu` |
| `EC2_SSH_KEY_B64` | Вміст приватного `.pem` SSH-ключа, закодований в одну base64-стрічку |
| `POSTGRES_PASSWORD` | Довгий production-пароль PostgreSQL; для цього прикладу використовуй літери/цифри, без пробілів і рядка переносу |

У Docker Hub створи репозиторій `nodeapp` у своєму namespace (public або private). Workflow публікує образи як `<DOCKERHUB_USERNAME>/nodeapp:<branch>` і `<DOCKERHUB_USERNAME>/nodeapp:<short-commit>`.

На Windows PowerShell перетвори локальний `.pem` у base64-рядок командою нижче, а результат збережи тільки як GitHub Secret. **Не додавай ключ або токен у репозиторій і не надсилай їх у чат.**

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\path\to\ec2-key.pem'))
```

Workflow запускає `npm ci`, build і tests. Pull request не деплоїться. На push GitHub Actions створює Docker Hub теги для назви гілки й короткого хешу коміту (еквівалент `git rev-parse --short HEAD`), авторизується в Docker Hub та публікує обидва теги. Push у `main` додатково запускає SSH deployment на EC2.

## Налаштування EC2

Workflow очікує Ubuntu EC2 instance. Переконайся, що instance доступний по SSH із GitHub Actions runner та що key pair відповідає `EC2_SSH_KEY_B64`. GitHub-hosted runner IP-адреси змінюються: не відкривай SSH для всього інтернету у production. Для лабораторної роботи тимчасово налаштуй доступ згідно з вимогами курсу, а після перевірки звузь правило; надійніший варіант — self-hosted runner або AWS Systems Manager.

Під час першого автоматичного deployment workflow передає на EC2 лише Compose/деплой файли й `.env` з правами `600`, встановлює Docker Engine/Compose, авторизує Docker Hub і запускає `scripts/deploy-ec2.sh`. Скрипт спочатку зупиняє PM2-сервіси попередньої практичної та прибирає старий контейнер, потім виконує:

```bash
docker rm -f nodeapp || true
docker compose pull app db
docker compose up -d --no-build --remove-orphans
```

Команди запускаються з `sudo` усередині скрипту. На EC2 порт `3000` можна відкрити у Security Group лише для своєї IP-адреси або переглядати застосунок через SSH tunnel. PostgreSQL порт прив'язано до loopback (`127.0.0.1`), тож назовні він не експонується. Дані зберігаються у Docker named volume `postgres-data`.

У workflow використовується `ssh-keyscan` для `known_hosts` лабораторного EC2. Для production закріпи й перевір fingerprint host key, або використовуй контрольований runner/SSM.

## Перевірка та діагностика

На EC2 або локально:

```bash
docker compose ps
docker compose logs --tail=100 app db
```

Для перевірки з'єднання в логах app шукай `PostgreSQL connection successful.`; endpoint `/api/db` повертає статус і час запиту до PostgreSQL. Якщо контейнер не став healthy, перевір `POSTGRES_PASSWORD`, стан сервісу `db` та `docker compose logs db`.

## Практичне заняття 12 — Terraform IaC

У папці `terraform/` є конфігурація, яка створює окремий Ubuntu 22.04 EC2 та Security Group для застосунку. Вона не змінює наявний інстанс `devops-lab`. Security Group відкриває TCP 22 для CIDR зі змінної `ssh_allowed_cidr` та TCP 3000 для вебзастосунку.

Перед запуском скопіюй `terraform/terraform.tfvars.example` у локальний `terraform/terraform.tfvars` і вкажи назву наявної AWS Key Pair та довірену SSH CIDR. `key_name` — це назва Key Pair у AWS, а не шлях до `.pem` чи вміст приватного ключа. Terraform AWS credentials потрібно налаштувати окремо через AWS CLI/profile; не додавай credentials, `.pem`, `terraform.tfstate` або `.terraform/` до Git. Локальний `terraform.tfvars` ігнорується через `.gitignore`; до репозиторію додавай лише `.tfvars.example`.

У PowerShell із теки `terraform` виконай `terraform fmt`, `terraform init`, `terraform validate`, `terraform plan`, перевір план, а потім `terraform apply`. Після створення скопіюй `instance_ip` у GitHub Secret `EC2_HOST`, перевір `EC2_USER` і відповідність Key Pair секрету `EC2_SSH_KEY_B64`, тоді push у `main` запустить наявний CI/CD workflow. SSH від GitHub-hosted runner може потребувати тимчасового доступу на порт 22; не залишай SSH відкритим для всіх після перевірки. Детальна інструкція є в [`terraform/README.md`](terraform/README.md).

Після перевірки роботи, щоб уникнути витрат, із теки `terraform` виконай `terraform destroy` і перевір видалення Terraform-ресурсів у консолі AWS. Команда не повинна видалити окремий старий інстанс `devops-lab`.

## Безпека й обмеження

- `.env`, `.pem`, `node_modules/` не включаються в Git або Docker build context; коміть лише `.env.example`.
- Зміни в PostgreSQL зберігаються у volume і переживають заміну app-контейнера. Не запускай `docker compose down -v`, якщо треба зберегти базу.
- У GitHub-репозиторії попередній workflow було перевірено успішно: тести, публікація Docker-образу до Docker Hub і Compose deployment на EC2 завершилися без помилок. Terraform-ресурси для Практичної 12 користувач створює окремо у своєму AWS-акаунті.

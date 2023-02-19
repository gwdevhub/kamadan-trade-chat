#!/bin/bash
echo "Args:"
echo $@
echo "End Args."
RED='\033[36m'
NC='\033[0m' # No Color
DB_USER=$1
DB_PASS=$2
DB_SCHEMA=$3
CURRENT_BASH_SCRIPT="${BASH_SOURCE[0]}"
PROJECT_CODE_FOLDER="$( cd "$( dirname "${CURRENT_BASH_SCRIPT}" )" >/dev/null 2>&1 && pwd )"
printf "${RED}*** Project code folder is ${PROJECT_CODE_FOLDER} ***${NC}\n";
SERVER_TIMEZONE="UTC"
if [ -f /sys/hypervisor/uuid ] && [ `head -c 3 /sys/hypervisor/uuid` == ec2 ]; then
  # EC2 server, use dig to find our public IP.
  SERVER_IP=$(dig +short myip.opendns.com @resolver1.opendns.com)
else
  # Local server, get last IP from hostname array
  SERVER_IP=$(hostname -I | awk '{ print $NF}')
fi
printf "${RED}*** Server IP is ${SERVER_IP} ***${NC}\n";

if [ "${SERVER_IP}" == "10.10.10.51" ]; then
  SSH_IP="10.10.10.1"
else
  SSH_IP=$(echo $SSH_CLIENT | awk '{ print $1}')
fi
printf "${RED}*** Connected ssh client is ${SSH_IP} ***${NC}\n";

REQUIRED_PACKAGES='apt-transport-https build-essential curl chrony mariadb-server software-properties-common tesseract-ocr git ssh psmisc nano chrpath libssl-dev libxft-dev libfreetype6 libfontconfig1 certbot'

sudo ln -sf /usr/share/zoneinfo/${SERVER_TIMEZONE} /etc/localtime; 
export NODE_ENV=production; 

# Required Packages process:
# 1. Check to see if we're missing any of the packages listed in REQUIRED_PACKAGES string using dpkg -s command
# 2. If we're missing some packages, run apt-get update and apt-get install to grab them.

sudo dpkg -s ${REQUIRED_PACKAGES} 2>/dev/null >/dev/null || (
  printf "${RED}*** Installing missing packages via apt-get ***${NC}\n";
  sudo apt-get install -y ${REQUIRED_PACKAGES});

# Install npm
npm -v | grep -q "[0-9]" || (sudo apt-get update && sudo apt install npm -y);
# npm -v 2>/dev/null > /dev/null || (curl -L https://npmjs.org/install.sh | sudo sh);

# Install nodejs
# 2021-02-17: MariaDB driver doesn't play nice with node 15
# https://github.com/mariadb-corporation/mariadb-connector-nodejs/issues/132
NODEJS_VERSION="14" 
node -v | grep -q "v${NODEJS_VERSION}" || (
  # sudo apt-get remove nodejs -y;
  sudo npm cache clean -f;
  sudo npm install -g n;
  sudo n ${NODEJS_VERSION};
);

# On Ubuntu > 16.04, run chronyd -q to make sure the time is up-to-date
#sudo chronyd -q

[[ ! -z "${DB_USER}" ]]  && (
	printf "${RED}*** Setting up database ***${NC}\n";
	cmp -s "/etc/mysql/mariadb.conf.d/zz_project.cnf" "${PROJECT_CODE_FOLDER}/server/my.cnf" || (
	  printf "${RED}*** Configuring mariadb database: copying over ${PROJECT_CODE_FOLDER}/server/my.cnf ***${NC}\n";
	  sudo cp -ura "${PROJECT_CODE_FOLDER}/server/my.cnf" "/etc/mysql/mariadb.conf.d/zz_project.cnf";
	  sudo service mysql restart);
	# User management bits
	sudo mysql -u root -e "DROP USER IF EXISTS '${DB_USER}'@'%';";
	# Localhost
	sudo mysql -u root -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';";
	sudo mysql -u root -e "SET PASSWORD FOR '${DB_USER}'@'localhost' = PASSWORD('${DB_PASS}');";
	sudo mysql -u root -e "GRANT ALL PRIVILEGES ON * . * TO '${DB_USER}'@'localhost';";
	# Developer's IP address
	sudo mysql -u root -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'${SSH_IP}' IDENTIFIED BY '${DB_PASS}';";
	sudo mysql -u root -e "SET PASSWORD FOR '${DB_USER}'@'${SSH_IP}' = PASSWORD('${DB_PASS}');";
	sudo mysql -u root -e "GRANT ALL PRIVILEGES ON * . * TO '${DB_USER}'@'${SSH_IP}';";
	sudo mysql -u root -e "FLUSH PRIVILEGES;";
	sudo mysql -u ${DB_USER} -p${DB_PASS} -e "CREATE DATABASE IF NOT EXISTS ${DB_SCHEMA};";
);

printf "${RED}*** Installing any missing node_modules ***${NC}\n";
forever --help 2>/dev/null > /dev/null || sudo npm install forever -g;
cd "${PROJECT_CODE_FOLDER}/server"
sudo npm install ./ --no-bin-links || exit 1;

# Combine all of the above commands into a single string. touch /tmp/forever.log && forever start -a -l /tmp/forever.log -o /tmp/forever.log -e /tmp/forever.log server.js

printf "${RED}*** ${PROJECT_CONTAINER}: Restarting server.js (forever stopall && forever start server.js) ***${NC}\n"; 
sudo forever stop ${PROJECT_CODE_FOLDER}/server/server.js; 
sudo touch /tmp/forever.log; 
sudo chmod 777 /tmp/forever.log;
sudo pkill -f kamadan-trade-client;
sudo forever start -a -l /tmp/forever.log -s -c "node --expose-gc" ${PROJECT_CODE_FOLDER}/server/server.js

# Add this script to crontab on system start
CRONTAB_FILENAME="$( basename "${PROJECT_CODE_FOLDER}" )"
printf "${RED}*** Crontab file for this bash script is ${CRONTAB_FILENAME} ***${NC}\n";

[[ -f "/etc/cron.d/${CRONTAB_FILENAME}" ]] && sudo rm "/etc/cron.d/${CRONTAB_FILENAME}";

echo "SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
USER=${USER}
@reboot ${USER} /bin/bash ${CURRENT_BASH_SCRIPT}" | sudo tee "/etc/cron.d/${CRONTAB_FILENAME}";
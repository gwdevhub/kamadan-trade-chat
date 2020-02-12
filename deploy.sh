#!/bin/bash
echo "Args:"
echo $@
echo "End Args."
RED='\033[36m'
NC='\033[0m' # No Color
#APP_DOMAIN='local.pricecheck.pebbledesign.com'
APP_DOMAIN=$1
PROJECT_CODE_FOLDER=$2
SERVER_TIMEZONE="UTC"

DOMAINS=${APP_DOMAIN}
DEFAULT_DOMAIN=${APP_DOMAIN}

REQUIRED_PACKAGES='apt-transport-https build-essential curl software-properties-common tesseract-ocr tor nodejs git ssh psmisc nano chrpath libssl-dev libxft-dev libfreetype6 libfreetype6-dev libfontconfig1 libfontconfig1-dev'
# Required Packages process:
# 1. Check to see if we're missing any of the packages listed in REQUIRED_PACKAGES string using dpkg -s command
# 2. If we're missing some packages, run apt-get update and apt-get install to grab them.
# NOTE: NodeJS is also installed at this stage via https://deb.nodesource.com/setup_6.x
REQUIRED_PACKAGES_CMD="\
	dpkg -s ${REQUIRED_PACKAGES} 2>/dev/null >/dev/null || (\
		printf \"${RED}*** ${PROJECT_CONTAINER}: Installing missing packages via apt-get ***${NC}\n\"; \
		apt-get update && apt-get install -y apt-transport-https build-essential curl; \
		curl -sL https://deb.nodesource.com/setup_12.x | bash -; \
		apt-get install -y ${REQUIRED_PACKAGES});"
# NodeJS process:
# 1. Install forever package if not present
# 2. cd to /home directory and unpack node_modules.tar.gz into here.
# 3. Check to see if the package.json has been modified (via shasum), delete existing package.json and run npm install if it has.
# 4. Finally, repack the node_modules folder to flag it as modified - a Git commit will upload the new archive when the developer saves their changes.
NODEJS_CMD="\
	printf \"${RED}*** ${PROJECT_CONTAINER}: Installing any missing node_modules ***${NC}\n\"; \
	forever --help 2>/dev/null > /dev/null || npm install forever -g;\
	cd /home; \
	rm -R /home/node_modules; \
	tar -zxf \"${PROJECT_CODE_FOLDER}/server/node_modules.tar.gz\"
	mkdir -p /home/node_modules; \
	( echo \"$(shasum ${PROJECT_CODE_FOLDER}/server/package.json | cut -d' ' -f1)  /home/node_modules/package.json\" | shasum -c ) || (\
		printf \"${RED}*** ${PROJECT_CONTAINER}: package.json file has been modified - running npm install ***${NC}\n\"; \
		npm config set loglevel=\"info\"; \
		npm config set progress=false; \
		npm install ${PROJECT_CODE_FOLDER}/server/ 2>&1 && rm -R /home/node_modules/kamadan-trade-server; \
		cp -ura ${PROJECT_CODE_FOLDER}/server/package.json /home/node_modules/package.json; \
		tar -zcf \"${PROJECT_CODE_FOLDER}/server/node_modules.tar.gz\" node_modules);"
# Combine all of the above commands into a single string. touch /tmp/forever.log && forever start -a -l /tmp/forever.log -o /tmp/forever.log -e /tmp/forever.log server.js
INSTALL_CMD="ln -sf /usr/share/zoneinfo/${SERVER_TIMEZONE} /etc/localtime; \
	export NODE_ENV=production; \
	${REQUIRED_PACKAGES_CMD} \
	${NODEJS_CMD} \
	printf \"${RED}*** ${PROJECT_CONTAINER}: Restarting server.js (forever stopall && forever start server.js) ***${NC}\n\"; \
	forever stopall; \
  touch /tmp/forever.log; \
  forever start -a -l /tmp/forever.log -s -c \"node --expose-gc\" ${PROJECT_CODE_FOLDER}/server/server.js"
eval $INSTALL_CMD
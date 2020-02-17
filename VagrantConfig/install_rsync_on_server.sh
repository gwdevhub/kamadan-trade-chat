#!/bin/bash

# Create SSH config...
tmpfile=".ssh_$1"; #$(mktemp)
echo "Exporting SSH config to $tmpfile"
vagrant ssh-config $1 > $tmpfile;

# SSH into the server and run install
echo "Running rsync install script on server";
RSYNC_DOWNLOAD="https://download.samba.org/pub/rsync/rsync-3.1.3.tar.gz"

RSYNC_INSTALL_CMD="\
	RSYNC_DOWNLOAD='https://download.samba.org/pub/rsync/rsync-3.1.3.tar.gz'; \
	if rsync --version | grep -q version ; then \
		echo 'Rsync is already installed.'; \
	else \
		echo 'Installing Rsync from $RSYNC_DOWNLOAD'; \
		cd ~/bin; \
		rm -R ~/bin/rsync*; \
		wget $RSYNC_DOWNLOAD; \
		tar -xvzf rsync*; \
		cd rsync*; \
		./configure && make; \
		cp rsync ~/bin/; \
	fi"
#echo "ssh -F \"${tmpfile}\" $1 \"${RSYNC_INSTALL_CMD}\"";
ssh -F "${tmpfile}" $1 "${RSYNC_INSTALL_CMD}";
#echo "done?"
	

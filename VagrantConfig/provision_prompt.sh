if [ $1 == "local" ]
then
	echo " "
	echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	echo "@"
	echo "@ All code for this server is COPIED FROM YOUR LOCAL MACHINE."
	echo "@"
	echo "@ If you have code on your computer that you don't want on the server, CTRL-C RIGHT NOW!!"
	echo "@"
	echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	echo " "
else
	echo " "
	echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	echo "@"
	echo "@ This server fetches the latest code base from a Git repository, NOT FROM YOUR LOCAL MACHINE"
	echo "@ Doing Git clone/pull from $2 into /vagrant, then copying (cp -ura) /vagrant/srv to /srv."
	echo "@"
	echo "@ Ensure that you have committed any changes that you have made to this branch:"
	echo "@"
	echo "@ 	$2"
	echo "@"
	echo "@ Otherwise any changes inside /srv won't be applied to this server!"
	echo "@"
	echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	echo " "
fi
while true; do
	read -p "Would you like to continue? (Y/N)" yn
    case $yn in
        [Yy]* ) exit 0;;
        [Nn]* ) exit -1;;
    esac
done
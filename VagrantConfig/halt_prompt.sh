echo " "
echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
echo "@"
echo "@ You're about to stop server $1."
echo "@"
echo "@ If you've got fat fingers and accidentally triggered this, and you don't want to stop the server, CTRL-C RIGHT NOW!!"
echo "@"
echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
echo " "

while true; do
	read -p "Would you like to continue? (Y/N)" yn
    case $yn in
        [Yy]* ) exit 0;;
        [Nn]* ) exit -1;;
    esac
done